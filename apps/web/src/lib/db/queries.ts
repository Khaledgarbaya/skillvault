import { eq, and, like, or, desc, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { skills, skillVersions, scanResults, installEvents, users } from "./schema";

export async function getSkillByOwnerAndName(
  db: DrizzleD1Database,
  ownerUsername: string,
  skillName: string,
) {
  const rows = await db
    .select({
      skill: skills,
      ownerUsername: users.username,
    })
    .from(skills)
    .innerJoin(users, eq(users.id, skills.ownerId))
    .where(and(eq(users.username, ownerUsername), eq(skills.name, skillName)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listPublicSkills(
  db: DrizzleD1Database,
  opts: { q?: string; sort?: string; page?: number; limit?: number },
) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(skills.visibility, "public")];

  if (opts.q) {
    const pattern = `%${opts.q}%`;
    conditions.push(or(like(skills.name, pattern), like(skills.description, pattern))!);
  }

  const orderBy =
    opts.sort === "downloads"
      ? desc(skills.downloadCount)
      : opts.sort === "name"
        ? skills.name
        : desc(skills.createdAt);

  const rows = await db
    .select({
      skill: skills,
      ownerUsername: users.username,
    })
    .from(skills)
    .innerJoin(users, eq(users.id, skills.ownerId))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return { items: rows, page, limit };
}

export async function createSkill(
  db: DrizzleD1Database,
  data: {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    repositoryUrl?: string;
    visibility?: "public" | "private";
  },
) {
  const now = new Date();
  await db.insert(skills).values({
    id: data.id,
    ownerId: data.ownerId,
    name: data.name,
    description: data.description ?? null,
    repositoryUrl: data.repositoryUrl ?? null,
    visibility: data.visibility ?? "public",
    downloadCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getVersions(db: DrizzleD1Database, skillId: string) {
  return db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .orderBy(
      desc(skillVersions.versionMajor),
      desc(skillVersions.versionMinor),
      desc(skillVersions.versionPatch),
    );
}

export async function getLatestVersion(db: DrizzleD1Database, skillId: string) {
  const rows = await db
    .select()
    .from(skillVersions)
    .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.status, "active")))
    .orderBy(
      desc(skillVersions.versionMajor),
      desc(skillVersions.versionMinor),
      desc(skillVersions.versionPatch),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function getVersion(db: DrizzleD1Database, skillId: string, version: string) {
  const rows = await db
    .select()
    .from(skillVersions)
    .where(and(eq(skillVersions.skillId, skillId), eq(skillVersions.version, version)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getScanForVersion(db: DrizzleD1Database, versionId: string) {
  const rows = await db
    .select()
    .from(scanResults)
    .where(eq(scanResults.skillVersionId, versionId))
    .orderBy(desc(scanResults.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateSkill(
  db: DrizzleD1Database,
  skillId: string,
  data: { description?: string; visibility?: "public" | "private"; repositoryUrl?: string },
) {
  await db
    .update(skills)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(skills.id, skillId));
}

export async function deleteSkill(db: DrizzleD1Database, skillId: string) {
  await db.delete(skills).where(eq(skills.id, skillId));
}

export async function getTarballKeysForSkill(db: DrizzleD1Database, skillId: string) {
  const rows = await db
    .select({ tarballKey: skillVersions.tarballKey })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId));

  return rows.map((r) => r.tarballKey);
}

export async function updateVersionStatus(
  db: DrizzleD1Database,
  versionId: string,
  data: { status: "deprecated" | "yanked"; deprecationMessage?: string; yankReason?: string },
) {
  await db
    .update(skillVersions)
    .set(data)
    .where(eq(skillVersions.id, versionId));
}

export async function incrementDownloads(db: DrizzleD1Database, skillId: string) {
  await db
    .update(skills)
    .set({ downloadCount: sql`${skills.downloadCount} + 1` })
    .where(eq(skills.id, skillId));
}

export async function recordInstallEvent(
  db: DrizzleD1Database,
  data: { id: string; skillVersionId: string; agentType: string },
) {
  await db.insert(installEvents).values({
    id: data.id,
    skillVersionId: data.skillVersionId,
    agentType: data.agentType,
    createdAt: new Date(),
  });
}
