# SKVault — Product Requirements Document (2-Week Launch Scope)

## What is this

SKVault is a registry and package manager for AI agent skills. It provides versioned, security-scanned skill hosting with private repositories and a CLI for managing skills across agent frameworks.

Think "npm registry for AI agent skills." Compatible with the open SKILL.md standard (originated by Anthropic, adopted by Vercel's skills.sh). SKVault adds the layer the ecosystem lacks: private repos, security scanning, versioning, lockfiles, and content-addressed storage.

## Domains

- **Primary**: `skvault.dev` — web UI, marketing, docs
- **Short**: `skv.sh` — CLI, API endpoints, lockfile URLs, badges
- **Reserved**: `agentpkg.dev` — parked for future use

## Problem

AI agent skills are scattered across GitHub repos with no standardized management. The current tools (npx skills, add-skill, openskills) treat skills as dumb file copies. No version pinning, no rollback, no integrity checks, no security scanning, no private repos.

## Target users (launch)

1. Individual developers who create and share agent skills
2. Teams that want private skill repos and consistent versions

## Tech stack

- **Monorepo**: pnpm workspaces
- **Framework**: TanStack Start (full-stack, SSR, file-based routing)
- **Auth**: better-auth (GitHub OAuth primary, email/password secondary)
- **Email**: Resend (transactional emails — verification, password reset, publish notifications)
- **UI**: shadcn/ui + Tailwind CSS
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite at edge)
- **ORM**: Drizzle ORM + Drizzle Kit (schema, migrations, type-safe queries)
- **Object Storage**: Cloudflare R2 (skill tarballs)
- **KV**: Cloudflare KV (session cache, registry metadata cache)
- **CLI**: Node.js, distributed via npm as `skvault` (binary name: `sk`)
- **Build**: tsup for shared + cli packages, Vinxi for web

## Monorepo Structure

pnpm workspace monorepo:

```
skvault/
├── pnpm-workspace.yaml             # packages: ["packages/*"]
├── package.json                    # private, root scripts
├── tsconfig.base.json              # shared TS config
├── .npmrc
├── packages/
│   ├── web/                        # @skvault/web — TanStack Start on CF Workers
│   │   ├── package.json            # depends on @skvault/shared: "workspace:*"
│   │   ├── wrangler.toml
│   │   ├── drizzle.config.ts       # Drizzle Kit config (D1 driver)
│   │   ├── app/routes/
│   │   ├── app/components/
│   │   ├── app/lib/
│   │   │   └── db/
│   │   │       ├── schema.ts       # Drizzle table definitions
│   │   │       └── index.ts        # drizzle() instance factory
│   │   └── drizzle/                # generated migrations (drizzle-kit generate)
│   ├── cli/                        # skvault (npm) — CLI binary "sk"
│   │   ├── package.json            # depends on @skvault/shared: "workspace:*"
│   │   ├── tsup.config.ts
│   │   └── src/
│   └── shared/                     # @skvault/shared — types, validation, scanner
│       ├── package.json
│       ├── tsup.config.ts
│       └── src/
│           ├── types.ts
│           ├── validation.ts
│           └── scanner/
```

Build order: `pnpm --filter @skvault/shared build` first, then web and cli. Root scripts use `pnpm -r` or `pnpm --filter` to target packages.

## Architecture Overview

```
┌─────────────┐     ┌──────────────────────────────────┐
│   CLI (sk)  │────▶│   Cloudflare Workers (API)       │
│             │     │                                  │
│   Web UI    │────▶│   TanStack Start SSR             │
│  (browser)  │     │   + API routes                   │
└─────────────┘     └──────┬───────┬───────────────────┘
                           │       │
                    ┌──────▼──┐ ┌──▼───┐
                    │   D1    │ │  R2  │
                    │ (meta)  │ │(blobs)│
                    └─────────┘ └──────┘
```

NOTE: Durable Objects, Queues, and advanced scanning are deferred to post-launch. Keep the launch architecture simple: Workers + D1 + R2 + KV.

---

## 2-WEEK LAUNCH SCOPE

### What ships

1. **Web UI**: Landing page, public skill directory, skill detail pages, login, user dashboard, publish flow
2. **API**: Skill CRUD, version publish/download, search, auth endpoints
3. **CLI**: init, login, add, install, publish, search, update, rollback
4. **Auth**: GitHub OAuth (primary), email/password
5. **Storage**: Content-addressed tarballs in R2, metadata in D1
6. **Scanning**: Rule-based only (secrets detection, dangerous patterns). No LLM scanning yet.
7. **Private skills**: Visibility toggle, token-based access
8. **Versioning**: Semver, lockfile, content hashing, symlink-based local store

### What does NOT ship (post-launch)

- Organization accounts, teams, namespaces
- SSO/SAML/OIDC
- LLM-based prompt threat scanning
- SBOM generation
- Org policies and approval workflows
- Audit logging
- Self-hosted option
- Profiles (CLI)
- Durable Objects (use simple mutex patterns instead)
- Cloudflare Queues (scan synchronously on publish for now)

---

## Data Model (Drizzle + D1) — Launch Scope

Schema defined in `packages/web/app/lib/db/schema.ts` using Drizzle ORM. Migrations generated with `drizzle-kit generate` and applied with `drizzle-kit migrate` (or `wrangler d1 migrations apply`).

### packages/web/app/lib/db/schema.ts

```typescript
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  githubId: text("github_id").unique(),
  ...timestamps,
});

export const skills = sqliteTable("skills", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  repositoryUrl: text("repository_url"),
  visibility: text("visibility", { enum: ["public", "private"] }).notNull().default("public"),
  downloadCount: integer("download_count").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("idx_skills_owner_name").on(table.ownerId, table.name),
  index("idx_skills_visibility").on(table.visibility),
  index("idx_skills_downloads").on(table.downloadCount),
]);

export const skillVersions = sqliteTable("skill_versions", {
  id: text("id").primaryKey(),
  skillId: text("skill_id").notNull().references(() => skills.id),
  version: text("version").notNull(),
  versionMajor: integer("version_major").notNull(),
  versionMinor: integer("version_minor").notNull(),
  versionPatch: integer("version_patch").notNull(),
  contentHash: text("content_hash").notNull(),
  tarballKey: text("tarball_key").notNull(),
  skillMdContent: text("skill_md_content"),
  frontmatter: text("frontmatter"),          // JSON string
  fileCount: integer("file_count").notNull().default(0),
  totalSizeBytes: integer("total_size_bytes").notNull().default(0),
  status: text("status", { enum: ["published", "deprecated", "yanked"] }).notNull().default("published"),
  deprecationMessage: text("deprecation_message"),
  yankReason: text("yank_reason"),
  publishedBy: text("published_by").references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  uniqueIndex("idx_versions_skill_version").on(table.skillId, table.version),
  index("idx_versions_skill_sorted").on(table.skillId, table.versionMajor, table.versionMinor, table.versionPatch),
]);

export const scanResults = sqliteTable("scan_results", {
  id: text("id").primaryKey(),
  skillVersionId: text("skill_version_id").notNull().references(() => skillVersions.id),
  engineVersion: text("engine_version").notNull().default("0.1.0"),
  status: text("status", { enum: ["pending", "pass", "warn", "fail"] }).notNull().default("pending"),
  secretsStatus: text("secrets_status"),
  secretsFindings: text("secrets_findings"),       // JSON array
  scriptsStatus: text("scripts_status"),
  scriptsFindings: text("scripts_findings"),
  overrideStatus: text("override_status"),
  overrideFindings: text("override_findings"),
  exfiltrationStatus: text("exfiltration_status"),
  exfiltrationFindings: text("exfiltration_findings"),
  hiddenInstructionsStatus: text("hidden_instructions_status"),
  hiddenInstructionsFindings: text("hidden_instructions_findings"),
  overallStatus: text("overall_status"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull(),
  scopes: text("scopes").notNull().default('["read","publish"]'),  // JSON array
  lastUsedAt: text("last_used_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_tokens_hash").on(table.tokenHash),
]);

export const installEvents = sqliteTable("install_events", {
  id: text("id").primaryKey(),
  skillVersionId: text("skill_version_id").notNull().references(() => skillVersions.id),
  agentType: text("agent_type"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index("idx_install_skill").on(table.skillVersionId),
]);
```

### packages/web/app/lib/db/index.ts

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
export { schema };
```

### packages/web/drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
```

Migrations generated via: `pnpm --filter @skvault/web drizzle-kit generate`
Applied locally via: `pnpm --filter @skvault/web drizzle-kit migrate` or `wrangler d1 migrations apply DB --local`

---

## R2 Storage Layout

```
/skills/{content_hash}.tar.gz       # skill tarballs (immutable, content-addressed)
```

---

## Environment Variables

### wrangler.toml (non-sensitive only)

```toml
[vars]
APP_URL = "https://skvault.dev"
```

### Wrangler Secrets (sensitive — never in wrangler.toml)

Push via `wrangler secret put <NAME>`:

- `GITHUB_CLIENT_ID` — GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth app client secret
- `AUTH_SECRET` — random 32-byte hex for session signing
- `RESEND_API_KEY` — Resend API key for transactional emails

For local dev, create a `.dev.vars` file (gitignored):

```
GITHUB_CLIENT_ID=your_dev_client_id
GITHUB_CLIENT_SECRET=your_dev_client_secret
AUTH_SECRET=your_dev_auth_secret
RESEND_API_KEY=your_dev_resend_key
```

### Local Development

```bash
pnpm build:shared                    # build shared package first
pnpm --filter @skvault/web dev       # TanStack Start dev server (uses .dev.vars)
# OR for production-like local testing:
pnpm build && pnpm --filter @skvault/web wrangler dev
```

---

## Transactional Emails (Resend)

Send via Resend API from Cloudflare Workers. From address: `noreply@skvault.dev`.

Emails for launch:
- **Email verification** — sent on register (email/password flow). Contains verification link with token.
- **Password reset** — sent on forgot-password request. Contains reset link with token. Expires in 1 hour.
- **Welcome** — sent after first successful login (GitHub or email verified). Brief onboarding: install CLI, publish first skill.

Post-launch (not for 2-week scope):
- Publish notification (your skill was installed X times this week)
- Security alert (new scan finding on your skill)

Email helper: `packages/web/app/lib/email.ts`
- `sendEmail({ to, subject, html })` — wraps Resend API call
- Use RESEND_API_KEY from env
- Plain function, no SDK needed (just fetch POST to `https://api.resend.com/emails`)

---

## API Routes — Launch Scope

Base URL: `https://skv.sh/api/v1`

### Auth
```
POST   /api/v1/auth/register              # email/password registration (sends verification email via Resend)
POST   /api/v1/auth/login                 # email/password login
GET    /api/v1/auth/github                 # GitHub OAuth redirect
GET    /api/v1/auth/github/callback        # GitHub OAuth callback
GET    /api/v1/auth/me                     # get current user
POST   /api/v1/auth/verify-email           # verify email from token in link
POST   /api/v1/auth/forgot-password        # send password reset email via Resend
POST   /api/v1/auth/reset-password         # reset password from token in link
POST   /api/v1/auth/tokens                # create API token
GET    /api/v1/auth/tokens                # list user's tokens
DELETE /api/v1/auth/tokens/:id            # revoke token
```

### Skills
```
GET    /api/v1/skills                              # search/list public skills (?q=react&sort=downloads&page=1)
GET    /api/v1/skills/:owner/:name                 # get skill metadata + latest version
GET    /api/v1/skills/:owner/:name/versions        # list all versions
GET    /api/v1/skills/:owner/:name/:version        # get specific version metadata
GET    /api/v1/skills/:owner/:name/:version/dl     # download tarball
GET    /api/v1/skills/:owner/:name/diff/:v1/:v2    # diff two versions (returns unified diff)
POST   /api/v1/skills                              # create new skill
POST   /api/v1/skills/:owner/:name/publish         # publish new version (multipart: tarball upload)
PATCH  /api/v1/skills/:owner/:name                 # update skill metadata (description, visibility)
PATCH  /api/v1/skills/:owner/:name/:version        # update version status (deprecate, yank)
DELETE /api/v1/skills/:owner/:name                 # delete skill (owner only)
```

### Scanning
```
GET    /api/v1/skills/:owner/:name/:version/scan   # get scan result for version
```

---

## Web UI Pages — Launch Scope

### Public
- `/` — Landing page (hero, value prop, code examples, CTA)
- `/explore` — Public skill directory (search, sort by: trending, popular, newest)
- `/:owner/:name` — Skill detail (README, versions list, install command, scan badge)
- `/:owner/:name/:version` — Version detail (scan report, diff from previous)
- `/login` — Login page (GitHub OAuth button + email/password form + forgot password link)
- `/register` — Registration page (sends verification email)
- `/forgot-password` — Password reset request
- `/reset-password` — New password form (from email link)

### Authenticated
- `/dashboard` — User overview (your skills, recent installs)
- `/dashboard/skills` — List your published skills
- `/dashboard/skills/new` — Publish skill via web (paste repo URL or upload)
- `/dashboard/skills/:name/settings` — Skill settings (visibility, description, delete)
- `/dashboard/tokens` — API token management (create, list, revoke)
- `/dashboard/settings` — Account settings (username, avatar, email)

---

## CLI — Launch Scope

Package name: `skvault` on npm. Binary: `sk`. Located at `packages/cli/`. Depends on `@skvault/shared` (workspace:*) for types, validation, and scanner.

### Commands for launch

```
sk init                                 # create skillfile.yaml in cwd
sk login                                # GitHub OAuth device flow, stores token in ~/.config/skv/config.json
sk logout                               # clear credentials

sk add <owner/name>                     # add skill to skillfile.yaml + install
sk add <owner/name>@<version>           # add specific version
sk install                              # install all from skillfile.yaml
sk install --frozen                     # lockfile-only mode (for CI)

sk update                               # interactive update check with diffs
sk update <name>                        # update specific skill

sk rollback <name>                      # revert to previous version (symlink swap)
sk remove <name>                        # remove from manifest + uninstall

sk diff <name>                          # diff installed vs latest
sk diff <name> <v1> <v2>                # diff two versions

sk publish                              # publish cwd as skill version
sk search <query>                       # search registry

sk token create --name <n>              # create API token
sk token list                           # list tokens
sk token revoke <id>                    # revoke token

sk config set registry <url>            # set custom registry (default: https://skv.sh)
```

### Local file structure

```
project-root/
├── skillfile.yaml                      # manifest (committed to git)
├── skillfile.lock                      # lockfile with hashes (committed to git)
└── .skills/                            # local store (gitignored)
    ├── store/
    │   ├── abc123f/                    # content-addressed
    │   │   ├── SKILL.md
    │   │   └── scripts/
    │   └── def456a/
    │       └── SKILL.md
    └── active/                         # symlinks to active versions
        ├── frontend-design -> ../store/abc123f
        └── seo-audit -> ../store/def456a
```

### skillfile.yaml

```yaml
registry: https://skv.sh
skills:
  frontend-design:
    source: anthropics/skills
    version: "^1.2.0"
  seo-audit:
    source: coreyhaines31/marketingskills
    version: "~2.0"
  internal-deploy:
    source: khaled/deploy-skill
    version: "3.1.0"
    private: true
```

### skillfile.lock

```yaml
frontend-design:
  source: anthropics/skills
  version: "1.3.0"
  resolved: "https://skv.sh/api/v1/skills/anthropics/frontend-design/1.3.0/dl"
  hash: "sha256:abc123f4e8..."
  scan_status: pass
seo-audit:
  source: coreyhaines31/marketingskills
  version: "2.0.3"
  resolved: "https://skv.sh/api/v1/skills/coreyhaines31/seo-audit/2.0.3/dl"
  hash: "sha256:def456a1b2..."
  scan_status: pass
```

### Agent integration

The CLI auto-detects installed agents and symlinks `.skills/active/*` into their skill directories:

```
claude-code:    .claude/skills/
cursor:         .cursor/skills/
codex:          .agents/skills/
copilot:        .github/skills/
gemini-cli:     .gemini/skills/
windsurf:       .windsurf/skills/
opencode:       .opencode/skills/
amp:            .amp/skills/
```

---

## Security Scanning — Launch Scope (Rule-Based Only)

Runs synchronously on publish. No queues, no Durable Objects. Scanner code lives in `packages/shared/src/scanner/` so both web and cli can use it. Must use only standard JS/TS APIs (no Node.js-specific code) to run in both Workers and Node.

### Code scanner
1. **Secrets detection** — regex for API keys, tokens, AWS keys, private keys, hardcoded passwords. Entropy analysis for high-entropy strings.
2. **Dangerous script patterns** — AST-free pattern matching on shell/JS/Python files: `eval()`, `exec()`, `curl | bash`, `rm -rf`, write to paths outside skill directory.

### Prompt scanner (rule-based)
1. **Override detection** — pattern match: "ignore previous instructions", "you are now", "forget everything above", "your new role is", "disregard", "override"
2. **Exfiltration patterns** — references to: env vars ($API_KEY, $SECRET, $TOKEN, process.env), sensitive paths (~/.ssh, ~/.aws, .env, ~/.gitconfig, /etc/passwd), external URL data transmission
3. **Hidden instructions** — zero-width unicode characters (U+200B, U+200C, U+200D, U+FEFF), HTML comments with instruction-like content, base64-encoded strings > 50 chars

### Scan output

Each finding has: severity (low/medium/high/critical), type, line number, detail, snippet.
Overall status = worst severity found. No findings = pass.

---

## Publish Flow (Launch)

```
1. CLI packages skill directory into .tar.gz
2. CLI computes SHA-256 of tarball
3. CLI uploads to POST /api/v1/skills/:owner/:name/publish (multipart form)
4. Worker validates SKILL.md frontmatter (name, description required)
5. Worker checks version doesn't already exist
6. Worker stores tarball in R2 at /skills/{hash}.tar.gz
7. Worker runs security scan synchronously
8. Worker creates skill_version + scan_results records in D1
9. Worker returns result (published + scan report) to CLI
10. CLI displays scan results and publish confirmation
```

---

## Install Flow (Launch)

```
1. CLI reads skillfile.yaml
2. For each skill, call GET /api/v1/skills/:owner/:name/versions to resolve version constraint
3. Compare resolved versions against skillfile.lock
4. For changed/new skills:
   a. Download tarball from /api/v1/skills/:owner/:name/:version/dl
   b. Verify SHA-256 matches
   c. Extract to .skills/store/{hash}/
   d. Update symlink in .skills/active/{name}
   e. Symlink into detected agent directories
5. Update skillfile.lock
6. Print summary of installed/updated skills
```

---

## Landing Page Content

Hero: "The package manager for AI agent skills"
Subhead: "Version, scan, and ship skills for Claude Code, Cursor, Codex, Copilot, and 10+ agents. Private repos included."

Three columns:
1. "Version everything" — semver, lockfiles, instant rollback
2. "Scan before you ship" — automated security scanning on every publish
3. "Private by default" — private skill repos for your team

Code example showing `sk publish` and `sk add` in action.

CTA: "Get started" -> GitHub OAuth login

---

## Day-by-Day Build Plan

### Days 1-2: Monorepo scaffold + Auth
- pnpm workspace with packages/web, packages/cli, packages/shared
- Root scripts using pnpm --filter (shared builds first)
- tsconfig.base.json + per-package tsconfigs
- D1 database schema with Drizzle ORM + drizzle-kit migrations
- Shared types in packages/shared
- better-auth setup (GitHub OAuth + email/password)
- Login/register pages with shadcn/ui
- Protected route middleware
- Deploy to Cloudflare Workers (get CI/CD working early)

### Days 3-4: Core API + R2
- Skill CRUD endpoints
- Version publish endpoint (tarball upload to R2)
- Version download endpoint (serve from R2)
- Content hashing (SHA-256 on upload, verify on download)
- Search endpoint with basic text search on D1
- API token creation and validation middleware

### Days 5-6: Security Scanner
- Build scanner in packages/shared/src/scanner/ (platform-agnostic)
- Rule-based code scanner (secrets, dangerous patterns)
- Rule-based prompt scanner (overrides, exfiltration, hidden instructions)
- Wire into publish flow in packages/web
- Scanner tests with vitest in packages/shared
- Scan result storage and retrieval API
- Scan badge endpoint (SVG badge for READMEs)

### Days 7-8: Web UI
- Landing page (hero, features, code examples)
- Explore page (public skill directory with search, sort, pagination)
- Skill detail page (README render, versions, scan badge, install command)
- Version detail page (scan report, diff)
- Dashboard (your skills, tokens)
- Publish flow (web-based)

### Days 9-10: CLI
- packages/cli: tsup build config, commander setup
- `sk login` (GitHub device flow)
- `sk init` (create skillfile.yaml)
- `sk publish` (package + upload + display scan results)
- `sk add` / `sk install` (download, verify hash, extract, symlink)
- `sk update` (version check + interactive diff)
- `sk rollback` (symlink swap)
- `sk search`
- Agent auto-detection and symlink setup
- Bundle @skvault/shared into CLI output (noExternal in tsup)
- Publish to npm: pnpm --filter skvault publish --access public

### Days 11-12: Private skills + polish
- Visibility toggle on skill creation
- Token-based auth for private skill download
- CLI handles private skill auth
- Error handling and edge cases across API/CLI/UI
- Loading states, empty states, error states in UI
- Mobile-responsive cleanup

### Days 13-14: Launch prep
- README for GitHub repo
- Quick-start docs on skvault.dev/docs
- Publish example skills to seed the directory
- Set up skv.sh short domain routing
- Final testing: `pnpm build && pnpm test` from root
- Full flow test: publish → install → update → rollback
- Write launch post (dev.to, Twitter/X, Reddit r/ClaudeAI, r/ChatGPTCoding)
- Deploy: `pnpm --filter @skvault/web run deploy`
- Publish CLI: `pnpm --filter skvault publish --access public`
