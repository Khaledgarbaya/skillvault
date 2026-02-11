import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { parseVersion, parseFrontmatter, validateTarballSize, scanSkill } from "@skvault/shared";
import { skillVersions, scanResults } from "./db/schema";
import { sha256Hex } from "./crypto";
import { parseTarball } from "./tarball";
import { normalizeUpload, isGzip } from "./upload";

export interface PublishInput {
  db: DrizzleD1Database;
  bucket: R2Bucket;
  skillId: string;
  publishedBy: string;
  version: string;
  tarball: ArrayBuffer;
  filename?: string; // original filename for format detection
}

export interface PublishResult {
  versionId: string;
  version: string;
  contentHash: string;
  scanId: string;
  scanStatus: string;
  tarballKey: string;
}

export async function publishSkillVersion(input: PublishInput): Promise<PublishResult> {
  const { db, bucket, skillId, publishedBy, version, filename } = input;
  let tarball = input.tarball;

  // Normalize format: convert zip → tar.gz if needed
  if (filename && !isGzip(tarball)) {
    tarball = await normalizeUpload(tarball, filename);
  }

  // Validate size
  if (!validateTarballSize(tarball.byteLength)) {
    throw new PublishError("Tarball exceeds maximum size of 5MB", 413);
  }

  // Parse semver
  const parsed = parseVersion(version);
  if (!parsed) {
    throw new PublishError("Invalid version format. Must be semver (e.g. 1.0.0)", 400);
  }

  // Check version doesn't already exist
  const existing = await db
    .select({ id: skillVersions.id })
    .from(skillVersions)
    .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.version, version)))
    .limit(1);

  if (existing.length > 0) {
    throw new PublishError(`Version ${version} already exists`, 409);
  }

  // Hash
  const contentHash = await sha256Hex(tarball);
  const tarballKey = `skills/${contentHash}.tar.gz`;

  // Extract tarball contents
  const contents = await parseTarball(tarball);
  if (!contents.skillMdContent) {
    throw new PublishError(
      "Tarball must contain a SKILL.md file at the root or one directory deep",
      400,
    );
  }

  const frontmatter = parseFrontmatter(contents.skillMdContent);
  if (!frontmatter) {
    throw new PublishError(
      "SKILL.md must have valid frontmatter with at least 'name' and 'description' fields",
      400,
    );
  }

  // Upload to R2 (idempotent — skip if hash already exists)
  const existingObject = await bucket.head(tarballKey);
  if (!existingObject) {
    await bucket.put(tarballKey, tarball, {
      httpMetadata: { contentType: "application/gzip" },
    });
  }

  // Run scan
  const scan = scanSkill(contents.textFiles);

  // Insert version + scan result
  const versionId = crypto.randomUUID();
  const scanId = crypto.randomUUID();

  await db.batch([
    db.insert(skillVersions).values({
      id: versionId,
      skillId,
      version,
      versionMajor: parsed.major,
      versionMinor: parsed.minor,
      versionPatch: parsed.patch,
      contentHash,
      tarballKey,
      skillMdContent: contents.skillMdContent,
      frontmatter: JSON.stringify(frontmatter),
      fileCount: contents.fileCount,
      totalSizeBytes: contents.totalSizeBytes,
      status: "active",
      publishedBy,
      createdAt: new Date(),
    }),
    db.insert(scanResults).values({
      id: scanId,
      skillVersionId: versionId,
      engineVersion: "0.1.0",
      status: "completed",
      secretsStatus: scan.secretsStatus,
      secretsFindings: JSON.stringify(scan.secretsFindings),
      permissionsStatus: scan.permissionsStatus,
      permissionsFindings: JSON.stringify(scan.permissionsFindings),
      networkStatus: scan.networkStatus,
      networkFindings: JSON.stringify(scan.networkFindings),
      filesystemStatus: scan.filesystemStatus,
      filesystemFindings: JSON.stringify(scan.filesystemFindings),
      overallStatus: scan.overallStatus,
      createdAt: new Date(),
    }),
  ]);

  return {
    versionId,
    version,
    contentHash,
    scanId,
    scanStatus: scan.overallStatus,
    tarballKey,
  };
}

export class PublishError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "PublishError";
  }
}
