import { eq, and, like, or, desc, sql, inArray, count } from "drizzle-orm";
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

export async function countPublicSkills(
  db: DrizzleD1Database,
  opts: { q?: string },
) {
  const conditions = [eq(skills.visibility, "public")];
  if (opts.q) {
    const pattern = `%${opts.q}%`;
    conditions.push(or(like(skills.name, pattern), like(skills.description, pattern))!);
  }
  const rows = await db
    .select({ total: count() })
    .from(skills)
    .where(and(...conditions));
  return rows[0]?.total ?? 0;
}

export async function getInstallsByAgent(db: DrizzleD1Database, skillId: string) {
  const rows = await db
    .select({
      agentType: installEvents.agentType,
      count: count(),
    })
    .from(installEvents)
    .innerJoin(skillVersions, eq(skillVersions.id, installEvents.skillVersionId))
    .where(eq(skillVersions.skillId, skillId))
    .groupBy(installEvents.agentType)
    .orderBy(desc(count()))
    .limit(6);

  return rows;
}

export async function getFirstPublishedDate(db: DrizzleD1Database, skillId: string) {
  const rows = await db
    .select({ createdAt: skillVersions.createdAt })
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skillId))
    .orderBy(skillVersions.createdAt)
    .limit(1);

  return rows[0]?.createdAt ?? null;
}

// ─── Dashboard queries ─────────────────────────────────────────────

export async function listUserSkills(db: DrizzleD1Database, userId: string) {
  const userSkills = await db
    .select({ skill: skills, ownerUsername: users.username })
    .from(skills)
    .innerJoin(users, eq(users.id, skills.ownerId))
    .where(eq(skills.ownerId, userId))
    .orderBy(desc(skills.updatedAt));

  if (userSkills.length === 0) return [];

  const skillIds = userSkills.map((r) => r.skill.id);

  // Get all versions for these skills
  const versions = await db
    .select()
    .from(skillVersions)
    .where(inArray(skillVersions.skillId, skillIds))
    .orderBy(
      desc(skillVersions.versionMajor),
      desc(skillVersions.versionMinor),
      desc(skillVersions.versionPatch),
    );

  const latestBySkill = new Map<string, typeof versions[0]>();
  for (const v of versions) {
    if (!latestBySkill.has(v.skillId)) {
      latestBySkill.set(v.skillId, v);
    }
  }

  // Fetch scans for latest versions
  const versionIds = [...latestBySkill.values()].map((v) => v.id);
  const scans =
    versionIds.length > 0
      ? await db
          .select()
          .from(scanResults)
          .where(inArray(scanResults.skillVersionId, versionIds))
      : [];

  const scanByVersion = new Map<string, typeof scans[0]>();
  for (const s of scans) {
    const existing = scanByVersion.get(s.skillVersionId);
    if (!existing || s.createdAt > existing.createdAt) {
      scanByVersion.set(s.skillVersionId, s);
    }
  }

  return userSkills.map((row) => {
    const latestVersion = latestBySkill.get(row.skill.id) ?? null;
    const scan = latestVersion ? scanByVersion.get(latestVersion.id) ?? null : null;
    return { ...row, latestVersion, scan };
  });
}

export async function getUserStats(db: DrizzleD1Database, userId: string) {
  const [skillCount] = await db
    .select({ total: count() })
    .from(skills)
    .where(eq(skills.ownerId, userId));

  const [downloadSum] = await db
    .select({ total: sql<number>`coalesce(sum(${skills.downloadCount}), 0)` })
    .from(skills)
    .where(eq(skills.ownerId, userId));

  const [versionCount] = await db
    .select({ total: count() })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(eq(skills.ownerId, userId));

  return {
    totalSkills: skillCount?.total ?? 0,
    totalDownloads: downloadSum?.total ?? 0,
    totalVersions: versionCount?.total ?? 0,
  };
}

export async function getRecentActivity(db: DrizzleD1Database, userId: string) {
  // Recent publishes by user
  const recentPublishes = await db
    .select({
      type: sql<string>`'publish'`.as("type"),
      skillName: skills.name,
      version: skillVersions.version,
      createdAt: skillVersions.createdAt,
    })
    .from(skillVersions)
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(eq(skillVersions.publishedBy, userId))
    .orderBy(desc(skillVersions.createdAt))
    .limit(10);

  // Recent installs of user's skills
  const recentInstalls = await db
    .select({
      type: sql<string>`'install'`.as("type"),
      skillName: skills.name,
      version: skillVersions.version,
      createdAt: installEvents.createdAt,
    })
    .from(installEvents)
    .innerJoin(skillVersions, eq(skillVersions.id, installEvents.skillVersionId))
    .innerJoin(skills, eq(skills.id, skillVersions.skillId))
    .where(eq(skills.ownerId, userId))
    .orderBy(desc(installEvents.createdAt))
    .limit(10);

  // Merge and sort
  const all = [...recentPublishes, ...recentInstalls]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return all;
}

// ─── Public queries ────────────────────────────────────────────────

export async function listPublicSkillsWithDetails(
  db: DrizzleD1Database,
  opts: { q?: string; sort?: string; page?: number; limit?: number },
) {
  const { items, page, limit } = await listPublicSkills(db, opts);
  if (items.length === 0) {
    const total = await countPublicSkills(db, { q: opts.q });
    return { items: [] as typeof enriched, page, limit, total };
  }

  const skillIds = items.map((r) => r.skill.id);

  // Fetch all active versions for these skills
  const versions = await db
    .select()
    .from(skillVersions)
    .where(
      and(
        inArray(skillVersions.skillId, skillIds),
        eq(skillVersions.status, "active"),
      ),
    )
    .orderBy(
      desc(skillVersions.versionMajor),
      desc(skillVersions.versionMinor),
      desc(skillVersions.versionPatch),
    );

  // Pick latest version per skill
  const latestBySkill = new Map<string, typeof versions[0]>();
  for (const v of versions) {
    if (!latestBySkill.has(v.skillId)) {
      latestBySkill.set(v.skillId, v);
    }
  }

  // Fetch scans for the latest versions
  const versionIds = [...latestBySkill.values()].map((v) => v.id);
  const scans =
    versionIds.length > 0
      ? await db
          .select()
          .from(scanResults)
          .where(inArray(scanResults.skillVersionId, versionIds))
      : [];

  const scanByVersion = new Map<string, typeof scans[0]>();
  for (const s of scans) {
    const existing = scanByVersion.get(s.skillVersionId);
    if (!existing || s.createdAt > existing.createdAt) {
      scanByVersion.set(s.skillVersionId, s);
    }
  }

  const enriched = items.map((row) => {
    const latestVersion = latestBySkill.get(row.skill.id) ?? null;
    const scan = latestVersion ? scanByVersion.get(latestVersion.id) ?? null : null;
    return { ...row, latestVersion, scan };
  });

  const total = await countPublicSkills(db, { q: opts.q });
  return { items: enriched, page, limit, total };
}
