import { createServerFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, ne } from "drizzle-orm";
import { validateSkillName, MAX_BASE64_LENGTH } from "@skvault/shared";
import { invalidateSessionCache } from "./auth/middleware";
import { createAuth } from "./auth/server";
import {
  getUserStats,
  getRecentActivity,
  listUserSkills,
  getSkillByOwnerAndName,
  getVersions,
  getScanForVersion,
  updateSkill,
  deleteSkill,
  getTarballKeysForSkill,
  updateVersionStatus,
  createSkill,
} from "./db/queries";
import { skills, users } from "./db/schema";
import { publishSkillVersion } from "./publish";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  authMiddleware,
} from "~/lib/middleware";
import type { LoggedAuthContext } from "~/lib/middleware";

// ─── Dashboard Home ────────────────────────────────────────────────

export const fetchDashboardData = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }: { context: LoggedAuthContext }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const [stats, activity, recentSkills] = await Promise.all([
      getUserStats(db, context.session.user.id),
      getRecentActivity(db, context.session.user.id),
      listUserSkills(db, context.session.user.id),
    ]);
    return {
      stats,
      activity,
      recentSkills: recentSkills.slice(0, 5),
    };
  });

// ─── Skills ────────────────────────────────────────────────────────

export const fetchUserSkills = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }: { context: LoggedAuthContext }) => {
    const db = drizzle(context.cloudflare.env.DB);
    return listUserSkills(db, context.session.user.id);
  });

export const fetchSkillSettings = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { name: string } }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const result = await getSkillByOwnerAndName(db, context.session.user.username!, data.name);
    if (!result || result.skill.ownerId !== context.session.user.id) {
      throw new Error("Skill not found");
    }
    const versions = await getVersions(db, result.skill.id);
    const scans = await Promise.all(
      versions.map((v) => getScanForVersion(db, v.id)),
    );
    return {
      skill: result.skill,
      ownerUsername: result.ownerUsername,
      versions: versions.map((v, i) => ({ ...v, scan: scans[i] })),
    };
  });

type UpdateSkillData = {
  skillId: string;
  description?: string;
  visibility?: "public" | "private";
  repositoryUrl?: string;
};

export const updateSkillAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: UpdateSkillData) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: UpdateSkillData }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, context.session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");
    const { skillId, ...updateData } = data;
    await updateSkill(db, skillId, updateData);
    return { success: true };
  });

export const deleteSkillAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { skillId: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { skillId: string } }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, context.session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");

    // Clean up R2 tarballs
    const keys = await getTarballKeysForSkill(db, data.skillId);
    const bucket = context.cloudflare.env.SKILLS_BUCKET;
    await Promise.all(keys.map((key) => bucket.delete(key)));

    await deleteSkill(db, data.skillId);
    return { success: true };
  });

type UpdateVersionStatusData = {
  versionId: string;
  status: "deprecated" | "yanked";
  message?: string;
};

export const updateVersionStatusAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: UpdateVersionStatusData) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: UpdateVersionStatusData }) => {
    const db = drizzle(context.cloudflare.env.DB);
    await updateVersionStatus(db, data.versionId, {
      status: data.status,
      deprecationMessage: data.status === "deprecated" ? data.message : undefined,
      yankReason: data.status === "yanked" ? data.message : undefined,
    });
    return { success: true };
  });

// ─── Publish ───────────────────────────────────────────────────────

type PublishSkillData = {
  name: string;
  description: string;
  visibility: "public" | "private";
};

export const publishSkillAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: PublishSkillData) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: PublishSkillData }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const skillId = crypto.randomUUID();
    await createSkill(db, {
      id: skillId,
      ownerId: context.session.user.id,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
    });
    return { skillId };
  });

type PublishVersionData = {
  skillId: string;
  version: string;
  tarball: string;
  filename: string;
};

export const publishVersionAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: PublishVersionData) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: PublishVersionData }) => {
    const db = drizzle(context.cloudflare.env.DB);

    // Reject oversized base64 before decoding to prevent memory exhaustion
    if (data.tarball.length > MAX_BASE64_LENGTH) {
      throw new Error("Upload exceeds maximum size of 5MB");
    }

    // Verify ownership
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, context.session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");

    const bucket = context.cloudflare.env.SKILLS_BUCKET;

    // Decode base64 tarball
    const binaryStr = atob(data.tarball);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const result = await publishSkillVersion({
      db,
      bucket,
      skillId: data.skillId,
      publishedBy: context.session.user.id,
      version: data.version,
      tarball: bytes.buffer as ArrayBuffer,
      filename: data.filename,
    });

    return result;
  });

export const validateSkillNameAction = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { name: string } }) => {
    const db = drizzle(context.cloudflare.env.DB);

    const validation = validateSkillName(data.name);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    // Check DB uniqueness for this user
    const existing = await getSkillByOwnerAndName(db, context.session.user.username!, data.name);
    if (existing) {
      return { valid: false, error: "You already have a skill with this name" };
    }

    return { valid: true, error: null };
  });

// ─── Tokens (via better-auth API key plugin) ──────────────────────

export const fetchUserTokens = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ request, context }: { request: Request; context: LoggedAuthContext }) => {
    const auth = createAuth(context.cloudflare.env);
    const keys = await auth.api.listApiKeys({
      headers: request.headers,
    });

    return (keys as any[]).map((key) => ({
      id: key.id,
      name: key.name ?? "Unnamed",
      scopes: formatPermissions(key.permissions),
      lastUsedAt: key.lastRequest ?? null,
      expiresAt: key.expiresAt ?? null,
      createdAt: key.createdAt,
    }));
  });

export const createTokenAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { name: string; scopes?: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { name: string; scopes?: string } }) => {
    const scopes = (data.scopes ?? "publish,read").split(",").map((s) => s.trim());
    const auth = createAuth(context.cloudflare.env);

    const result = await auth.api.createApiKey({
      body: {
        name: data.name,
        prefix: "sk",
        userId: context.session.user.id,
        permissions: { skills: scopes },
      },
    });

    return { token: result.key };
  });

export const revokeTokenAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ data, context }: { context: LoggedAuthContext; data: { tokenId: string } }) => {
    const auth = createAuth(context.cloudflare.env);
    await auth.api.deleteApiKey({
      body: { keyId: data.tokenId },
    });
    return { success: true };
  });

function formatPermissions(permissions: unknown): string {
  if (!permissions || typeof permissions !== "object") return "publish,read";
  const perms = permissions as Record<string, string[]>;
  const skillsPerms = perms.skills;
  if (Array.isArray(skillsPerms)) return skillsPerms.join(",");
  return "publish,read";
}

// ─── Account Settings ──────────────────────────────────────────────

export const updateProfileAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { displayName?: string; username?: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { displayName?: string; username?: string } }) => {
    const db = drizzle(context.cloudflare.env.DB);

    if (data.username) {
      // Check uniqueness
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, data.username), ne(users.id, context.session.user.id)))
        .limit(1);
      if (existing) {
        throw new Error("Username already taken");
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.username !== undefined) updateData.username = data.username;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, context.session.user.id));

    invalidateSessionCache();
    return { success: true };
  });

export const changePasswordAction = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { currentPassword: string; newPassword: string }) => data)
  .handler(async ({ request, context, data }: { request: Request; context: LoggedAuthContext; data: { currentPassword: string; newPassword: string } }) => {
    const auth = createAuth(context.cloudflare.env);
    await auth.api.changePassword({
      headers: request.headers,
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });
    return { success: true };
  });
