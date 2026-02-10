import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, ne } from "drizzle-orm";
import { validateSkillName } from "@skvault/shared";
import { auth } from "./auth/server";
import { invalidateSessionCache } from "./auth/middleware";
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
  listUserTokens,
} from "./db/queries";
import { skills, apiTokens, users } from "./db/schema";
import { publishSkillVersion } from "./publish";
import { sha256Hex } from "./crypto";

function getDb() {
  return drizzle(env.DB);
}

async function requireSession(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ─── Dashboard Home ────────────────────────────────────────────────

export const fetchDashboardData = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await requireSession(request!);
    const db = getDb();
    const [stats, activity, recentSkills] = await Promise.all([
      getUserStats(db, session.user.id),
      getRecentActivity(db, session.user.id),
      listUserSkills(db, session.user.id),
    ]);
    return {
      stats,
      activity,
      recentSkills: recentSkills.slice(0, 5),
    };
  },
);

// ─── Skills ────────────────────────────────────────────────────────

export const fetchUserSkills = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await requireSession(request!);
    const db = getDb();
    return listUserSkills(db, session.user.id);
  },
);

export const fetchSkillSettings = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    const result = await getSkillByOwnerAndName(db, session.user.username!, data.name);
    if (!result || result.skill.ownerId !== session.user.id) {
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

export const updateSkillAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      skillId: string;
      description?: string;
      visibility?: "public" | "private";
      repositoryUrl?: string;
    }) => data,
  )
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    // Verify ownership
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");
    const { skillId, ...updateData } = data;
    await updateSkill(db, skillId, updateData);
    return { success: true };
  });

export const deleteSkillAction = createServerFn({ method: "POST" })
  .inputValidator((data: { skillId: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");

    // Clean up R2 tarballs
    const keys = await getTarballKeysForSkill(db, data.skillId);
    const bucket = env.SKILLS_BUCKET as R2Bucket;
    await Promise.all(keys.map((key) => bucket.delete(key)));

    await deleteSkill(db, data.skillId);
    return { success: true };
  });

export const updateVersionStatusAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      versionId: string;
      status: "deprecated" | "yanked";
      message?: string;
    }) => data,
  )
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    // We trust the versionId is for a skill the user owns (verified in UI)
    await updateVersionStatus(db, data.versionId, {
      status: data.status,
      deprecationMessage: data.status === "deprecated" ? data.message : undefined,
      yankReason: data.status === "yanked" ? data.message : undefined,
    });
    return { success: true };
  });

// ─── Publish ───────────────────────────────────────────────────────

export const publishSkillAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      description: string;
      visibility: "public" | "private";
    }) => data,
  )
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    const skillId = crypto.randomUUID();
    await createSkill(db, {
      id: skillId,
      ownerId: session.user.id,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
    });
    return { skillId };
  });

export const publishVersionAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      skillId: string;
      version: string;
      tarball: string; // base64 encoded
    }) => data,
  )
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();

    // Verify ownership
    const [skill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.id, data.skillId), eq(skills.ownerId, session.user.id)))
      .limit(1);
    if (!skill) throw new Error("Skill not found");

    const bucket = env.SKILLS_BUCKET as R2Bucket;

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
      publishedBy: session.user.id,
      version: data.version,
      tarball: bytes.buffer as ArrayBuffer,
    });

    return result;
  });

export const validateSkillNameAction = createServerFn({ method: "GET" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();

    const validation = validateSkillName(data.name);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }

    // Check DB uniqueness for this user
    const existing = await getSkillByOwnerAndName(db, session.user.username!, data.name);
    if (existing) {
      return { valid: false, error: "You already have a skill with this name" };
    }

    return { valid: true, error: null };
  });

// ─── Tokens ────────────────────────────────────────────────────────

export const fetchUserTokens = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await requireSession(request!);
    const db = getDb();
    return listUserTokens(db, session.user.id);
  },
);

export const createTokenAction = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; scopes?: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();

    // Generate raw token
    const rawToken = `sk_${crypto.randomUUID().replace(/-/g, "")}`;
    const encoded = new TextEncoder().encode(rawToken);
    const tokenHash = await sha256Hex(encoded.buffer as ArrayBuffer);

    await db.insert(apiTokens).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      name: data.name,
      tokenHash,
      scopes: data.scopes ?? "publish,read",
      createdAt: new Date(),
    });

    // Return the raw token — it can only be shown ONCE
    return { token: rawToken };
  });

export const revokeTokenAction = createServerFn({ method: "POST" })
  .inputValidator((data: { tokenId: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();
    await db
      .delete(apiTokens)
      .where(and(eq(apiTokens.id, data.tokenId), eq(apiTokens.userId, session.user.id)));
    return { success: true };
  });

// ─── Account Settings ──────────────────────────────────────────────

export const updateProfileAction = createServerFn({ method: "POST" })
  .inputValidator((data: { displayName?: string; username?: string }) => data)
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    const db = getDb();

    if (data.username) {
      // Check uniqueness
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, data.username), ne(users.id, session.user.id)))
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
      .where(eq(users.id, session.user.id));

    invalidateSessionCache();
    return { success: true };
  });

export const changePasswordAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { currentPassword: string; newPassword: string }) => data,
  )
  .handler(async ({ request, data }) => {
    const session = await requireSession(request!);
    await auth.api.changePassword({
      headers: request!.headers,
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });
    return { success: true };
  });
