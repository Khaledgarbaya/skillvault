import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  githubId: text("github_id").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    repositoryUrl: text("repository_url"),
    visibility: text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("public"),
    downloadCount: integer("download_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("skills_owner_name_idx").on(table.ownerId, table.name),
    index("skills_owner_idx").on(table.ownerId),
  ],
);

export const skillVersions = sqliteTable(
  "skill_versions",
  {
    id: text("id").primaryKey(),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    versionMajor: integer("version_major").notNull(),
    versionMinor: integer("version_minor").notNull(),
    versionPatch: integer("version_patch").notNull(),
    contentHash: text("content_hash").notNull(),
    tarballKey: text("tarball_key").notNull(),
    skillMdContent: text("skill_md_content"),
    frontmatter: text("frontmatter"),
    fileCount: integer("file_count").notNull(),
    totalSizeBytes: integer("total_size_bytes").notNull(),
    status: text("status", { enum: ["active", "deprecated", "yanked"] })
      .notNull()
      .default("active"),
    deprecationMessage: text("deprecation_message"),
    yankReason: text("yank_reason"),
    publishedBy: text("published_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("skill_versions_skill_version_idx").on(table.skillId, table.version),
    index("skill_versions_skill_idx").on(table.skillId),
  ],
);

export const scanResults = sqliteTable(
  "scan_results",
  {
    id: text("id").primaryKey(),
    skillVersionId: text("skill_version_id")
      .notNull()
      .references(() => skillVersions.id, { onDelete: "cascade" }),
    engineVersion: text("engine_version").notNull(),
    status: text("status", { enum: ["pending", "running", "completed", "failed"] })
      .notNull()
      .default("pending"),
    secretsStatus: text("secrets_status", { enum: ["pass", "fail", "warn"] }),
    secretsFindings: text("secrets_findings"),
    permissionsStatus: text("permissions_status", { enum: ["pass", "fail", "warn"] }),
    permissionsFindings: text("permissions_findings"),
    networkStatus: text("network_status", { enum: ["pass", "fail", "warn"] }),
    networkFindings: text("network_findings"),
    filesystemStatus: text("filesystem_status", { enum: ["pass", "fail", "warn"] }),
    filesystemFindings: text("filesystem_findings"),
    overallStatus: text("overall_status", { enum: ["pass", "fail", "warn"] }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("scan_results_version_idx").on(table.skillVersionId),
  ],
);

export const apiTokens = sqliteTable(
  "api_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: text("scopes").notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("api_tokens_user_idx").on(table.userId),
  ],
);

export const installEvents = sqliteTable(
  "install_events",
  {
    id: text("id").primaryKey(),
    skillVersionId: text("skill_version_id")
      .notNull()
      .references(() => skillVersions.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("install_events_version_idx").on(table.skillVersionId),
  ],
);
