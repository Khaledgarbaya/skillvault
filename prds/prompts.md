# SKVault — Claude Code Prompts

Use these prompts in sequence. Each one builds on the previous. Feed the PRD (prd-skvault-launch.md) as context in your Claude Code project first.

---

## PROMPT 1: Monorepo Scaffold + Cloudflare Setup

```
Read the PRD in prd-skvault-launch.md. This is the full spec for SKVault.

Set up a pnpm workspace monorepo. Plain pnpm workspaces with --filter scripts.

skvault/
├── pnpm-workspace.yaml
├── package.json                    # root: private, scripts using pnpm --filter
├── tsconfig.base.json              # shared TS config all packages extend
├── .npmrc                          # strict-peer-dependencies=true
├── .gitignore
├── packages/
│   ├── web/                        # TanStack Start app (Cloudflare Workers)
│   │   ├── package.json
│   │   ├── tsconfig.json           # extends ../../tsconfig.base.json
│   │   ├── wrangler.toml
│   │   ├── app/
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   └── lib/
│   │   └── migrations/             # D1 SQL migration files
│   ├── cli/                        # CLI published to npm as "skvault"
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts
│   │   └── src/
│   └── shared/                     # @skvault/shared — types, validation, scanner
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           ├── validation.ts
│           └── scanner/

Step by step:

1. Create root package.json:
   - name: "skvault", private: true
   - Scripts using pnpm --filter (shared builds first, then the rest):
     "build:shared": "pnpm --filter @skvault/shared build",
     "build:web": "pnpm --filter @skvault/web build",
     "build:cli": "pnpm --filter skvault build",
     "build": "pnpm build:shared && pnpm build:web && pnpm build:cli",
     "dev": "pnpm build:shared && pnpm --filter @skvault/web dev",
     "dev:cli": "pnpm --filter skvault dev",
     "dev:wrangler": "pnpm build && pnpm --filter @skvault/web wrangler dev",
     "test": "pnpm -r test",
     "db:generate": "pnpm --filter @skvault/web run db:generate",
     "db:migrate": "pnpm --filter @skvault/web run db:migrate"
   - devDependencies: typescript, prettier

2. Create pnpm-workspace.yaml:
   packages:
     - "packages/*"

3. Create tsconfig.base.json at root:
   - target: ES2022, module: ESNext, moduleResolution: bundler
   - strict: true, skipLibCheck: true

4. Set up packages/shared:
   - package.json: name "@skvault/shared"
   - main: "dist/index.js", types: "dist/index.d.ts"
   - exports: { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } }
   - pnpm --filter @skvault/shared add -D tsup
   - tsup.config.ts: entry ["src/index.ts"], format ["esm"], dts true, clean true
   - scripts: { "build": "tsup", "dev": "tsup --watch" }
   - Create src/types.ts: TypeScript interfaces for every D1 table in the PRD
   - Create src/validation.ts: export stub functions (implemented in Prompt 3)
   - Create src/scanner/types.ts: ScanResult and ScanFinding types
   - Create src/index.ts: re-export everything

5. Set up packages/web:
   - Initialize TanStack Start with Cloudflare Workers adapter (Vinxi/Nitro Cloudflare preset)
   - package.json: name "@skvault/web", depends on "@skvault/shared": "workspace:*"
   - pnpm --filter @skvault/web add drizzle-orm
   - pnpm --filter @skvault/web add -D drizzle-kit
   - Configure Tailwind CSS 4 and install shadcn/ui (pnpm dlx shadcn@latest init, "new york" style, zinc color)
   - Create wrangler.toml:
     - D1 binding (name: DB)
     - R2 binding (name: SKILLS_BUCKET)
     - KV binding (name: CACHE)
     - [vars] section for non-sensitive config only: APP_URL
     - Do NOT put secrets in wrangler.toml
   - Create .dev.vars (gitignored) for local dev secrets:
     GITHUB_CLIENT_ID=dev_value
     GITHUB_CLIENT_SECRET=dev_value
     AUTH_SECRET=dev_value
     RESEND_API_KEY=dev_value
   - Add .dev.vars to .gitignore
   - Create drizzle.config.ts:
     schema: "./app/lib/db/schema.ts", out: "./drizzle", dialect: "sqlite"
   - Create app/lib/db/schema.ts with Drizzle table definitions for ALL tables in the PRD
     (users, skills, skillVersions, scanResults, apiTokens, installEvents)
     Use sqliteTable, text, integer from drizzle-orm/sqlite-core
     Include all indexes and unique constraints from the PRD
   - Create app/lib/db/index.ts:
     import { drizzle } from "drizzle-orm/d1"
     export function createDb(d1: D1Database) { return drizzle(d1, { schema }) }
   - Generate migration: pnpm --filter @skvault/web drizzle-kit generate
   - Add health check: GET /api/v1/health → { status: "ok", timestamp }
   - scripts:
     "dev": "vinxi dev",
     "build": "vinxi build",
     "db:generate": "drizzle-kit generate",
     "db:migrate": "wrangler d1 migrations apply DB --local"

6. Set up packages/cli:
   - package.json: name "skvault", bin: { "sk": "./dist/index.js" }
   - Depends on "@skvault/shared": "workspace:*"
   - pnpm --filter skvault add -D tsup
   - tsup.config.ts: entry ["src/index.ts"], format ["esm"], target "node18", banner { js: "#!/usr/bin/env node" }, clean true, noExternal ["@skvault/shared"]
   - scripts: { "build": "tsup", "dev": "tsup --watch" }
   - Stub src/index.ts that prints "sk v0.1.0"

7. Verify:
   - `pnpm install` succeeds
   - `pnpm build` builds shared first, then web + cli
   - `pnpm dev` starts the web dev server (reads .dev.vars for secrets)
   - For production-like local testing: `pnpm build && pnpm --filter @skvault/web wrangler dev`
   - `pnpm build:cli && node packages/cli/dist/index.js` prints version

Do NOT set up auth yet. Focus purely on monorepo structure, workspace deps, and database schema.
```

---

## PROMPT 2: Authentication (better-auth + GitHub OAuth)

```
Set up authentication using better-auth in the web package and transactional emails with Resend.

1. Install:
   pnpm --filter @skvault/web add better-auth

   Configure for Cloudflare Workers + D1:
   - D1 as database adapter
   - GitHub OAuth as primary login
   - Email/password as secondary
   - Sessions via cookies (httpOnly, secure, sameSite: lax)
   - Create packages/web/app/lib/auth/server.ts for server-side config
   - Create packages/web/app/lib/auth/client.ts for client-side helpers

2. Email helper (packages/web/app/lib/email.ts):
   - sendEmail({ to, subject, html }): POST to https://api.resend.com/emails
   - Uses RESEND_API_KEY from env (wrangler secret, .dev.vars locally)
   - From: "SKVault <noreply@skvault.dev>"
   - No SDK — just a fetch wrapper, keeps the bundle small for Workers

3. Auth API routes in packages/web/app/routes/api/v1/auth/:
   - register.ts — POST (email + password + username). Sends verification email via Resend with a token link.
   - verify-email.ts — POST (token). Marks email as verified.
   - login.ts — POST (email + password). Reject if email not verified.
   - forgot-password.ts — POST (email). Sends password reset email via Resend. Token expires in 1 hour.
   - reset-password.ts — POST (token + new password).
   - github.ts — GET (redirect to GitHub)
   - github.callback.ts — GET (GitHub users skip email verification)
   - me.ts — GET (current user or 401)
   - logout.ts — POST
   - tokens.ts — GET (list), POST (create)
   - tokens.$id.ts — DELETE (revoke)

4. Auth middleware in packages/web/app/lib/auth/middleware.ts:
   - requireAuth: 401 if not authenticated
   - optionalAuth: attaches user if present, continues if not
   - requireToken: validates API token from Authorization: Bearer header (SHA-256 hash lookup via Drizzle)

5. API token endpoints:
   - POST /api/v1/auth/tokens — create, return plaintext ONCE, store SHA-256 hash
   - GET /api/v1/auth/tokens — list (name, scopes, created, last_used — never hash)
   - DELETE /api/v1/auth/tokens/:id — revoke

6. Web UI pages in packages/web/app/routes/:
   - login.tsx — shadcn Card: GitHub OAuth button (primary, large) + email/password form
   - register.tsx — form: email, username, password, confirm
   - forgot-password.tsx — email input, sends reset link
   - reset-password.tsx — new password form (token from URL)
   - Use shadcn Card, Input, Button, Label
   - Redirect to /dashboard after login
   - User avatar + username in top nav on authenticated pages

7. Protected layout in packages/web/app/routes/dashboard.tsx:
   - Wraps all /dashboard/* routes
   - Server-side loader checks auth, redirects to /login if not authenticated

Sensitive env vars — push as wrangler secrets, never in wrangler.toml:
  wrangler secret put GITHUB_CLIENT_ID
  wrangler secret put GITHUB_CLIENT_SECRET
  wrangler secret put AUTH_SECRET
  wrangler secret put RESEND_API_KEY

For local dev, these go in packages/web/.dev.vars (already gitignored from Prompt 1).

Non-sensitive vars in wrangler.toml [vars]:
  APP_URL = "https://skvault.dev" (or http://localhost:3000 for dev)

All auth types (User, Session, ApiToken) come from @skvault/shared.
```

---

## PROMPT 3: Shared Validation + Core Skills API

```
Build shared validation in packages/shared and core skills API in packages/web.

PART 1: packages/shared/src/validation.ts

Used by both web and cli:

- validateSkillName(name): { valid: boolean; error?: string }
  Lowercase alphanumeric + hyphens, 3-50 chars, no start/end hyphen

- parseSemver(version): { major, minor, patch } | null

- compareSemver(a, b): -1 | 0 | 1

- resolveSemverRange(constraint, versions[]): string | null
  Supports ^, ~, exact, >= < range

- parseFrontmatter(content): { name, description, ... } | null
  Parse YAML frontmatter from SKILL.md, require name + description

- validateTarballSize(bytes): boolean — max 5MB

Export all from packages/shared/src/index.ts. Run `pnpm build:shared` to verify.

PART 2: packages/web/app/routes/api/v1/skills/

1. Skill CRUD:
   - index.ts:
     POST: create skill (auth required). Use validateSkillName from @skvault/shared. Generate ID with nanoid.
     GET: search/list public skills. Params: q, sort, page, limit. Use Drizzle like() on name + description.
   - $owner.$name.ts:
     GET: skill + latest version + scan. Private requires auth + ownership.
     PATCH: update description, visibility, repo URL (owner only).
     DELETE: skill + versions + R2 tarballs (owner only).

2. Version routes in api/v1/skills/$owner.$name/:
   - versions.ts — GET: list versions (semver desc)
   - $version.ts — GET: version + scan. PATCH: deprecate/yank (owner only).
   - $version.dl.ts — GET: stream tarball from R2. Increment downloads. Record install_event.

3. Diff: diff.$v1.$v2.ts — GET: unified text diff of skill_md_content

4. DB query functions in packages/web/app/lib/db/queries.ts:
   - Use Drizzle query builder, no raw SQL
   - Import schema from ./schema, use eq, like, desc, and, or from drizzle-orm
   - getSkillByOwnerAndName(db, owner, name) — join users to resolve owner
   - listPublicSkills(db, { q, sort, page, limit }) — like() for search, orderBy for sort
   - createSkill(db, data) — db.insert(schema.skills).values(...)
   - getVersions(db, skillId) — ordered by semver desc
   - getLatestVersion(db, skillId) — limit 1
   - incrementDownloads(db, skillId)

Thin route handlers. Import validation from @skvault/shared. Consistent error format: { error, details? }.
```

---

## PROMPT 4: Publish Flow + R2 Upload

```
Build the publish endpoint in packages/web. Most critical flow.

Route: packages/web/app/routes/api/v1/skills/$owner.$name.publish.ts
Method: POST (multipart form)

1. Auth required, owner only. Accept: version (string) + tarball (File/Blob).
   Validate version with parseSemver from @skvault/shared.

2. packages/web/app/lib/publish.ts — publishSkillVersion function:
   a. Receive tarball as ArrayBuffer
   b. SHA-256 via Web Crypto: crypto.subtle.digest("SHA-256", buffer)
   c. Extract tarball in-memory (DecompressionStream for gzip, then parse tar headers):
      - Find SKILL.md at root or one level deep
      - Parse frontmatter with parseFrontmatter from @skvault/shared
      - Collect: file list, count, total size, full SKILL.md content
   d. Check version doesn't exist: db.select().from(schema.skillVersions).where(...)
   e. Store in R2: `skills/${hash}.tar.gz`
   f. Run scan synchronously (stub for now, Prompt 5 implements)
   g. Insert with Drizzle: db.insert(schema.skillVersions).values(...) and db.insert(schema.scanResults).values(...)
   h. Return { version, hash, scan, url }

3. Idempotency: skip R2 upload if hash exists. 409 if version exists.

4. Errors: 400 (no SKILL.md, bad frontmatter, bad version), 409, 413 (>5MB), 401/403.

5. Workers constraints: no fs, everything ArrayBuffer/Uint8Array. R2 accepts ArrayBuffer.

Put tarball parsing in packages/web/app/lib/tarball.ts.
Put hashing in packages/web/app/lib/crypto.ts.
Keep publish.ts as orchestrator.
```

---

## PROMPT 5: Security Scanner

```
Build rule-based scanner in packages/shared so both web and cli use it.

1. Entry (packages/shared/src/scanner/index.ts):
   export async function scanSkill(files: SkillFile[]): Promise<ScanResult>
   type SkillFile = { path: string; content: string }

2. Code scanner (packages/shared/src/scanner/code-scanner.ts):
   export function scanCode(files): ScanFinding[]
   a. Secrets: AWS keys (AKIA), GitHub tokens (ghp_), API keys, private keys, Slack tokens, high-entropy strings (>4.5 Shannon entropy, >20 chars). Skip .md files.
   b. Dangerous scripts (.sh/.py/.js/.ts only): curl|bash, rm -rf, eval(), exec(), subprocess shell=True, reads from ~/.ssh, ~/.aws, /etc/passwd

3. Prompt scanner (packages/shared/src/scanner/prompt-scanner.ts):
   export function scanPrompt(files): ScanFinding[]
   .md files only:
   a. Overrides: "ignore previous instructions", "you are now", "forget everything above", etc.
   b. Exfiltration: $API_KEY, process.env, ~/.ssh, "send to" + file refs
   c. Hidden: zero-width chars, HTML comments with instructions, base64 >50 chars

4. Types (packages/shared/src/scanner/types.ts):
   ScanFinding = { severity, type, file, line, detail, snippet }
   ScanResult = { status, findings, per-category statuses }

5. Aggregation: overall = worst category. "fail" if high/critical, "warn" if medium/low, "pass" if none.

6. Wire into publish: in packages/web/app/lib/publish.ts replace stub with:
   import { scanSkill } from "@skvault/shared"

7. Tests:
   pnpm --filter @skvault/shared add -D vitest
   Add "test": "vitest run" to packages/shared/package.json
   Test: clean SKILL.md passes, AWS key flagged, eval() flagged, "ignore previous instructions" flagged, zero-width flagged, normal $HOME docs don't false-positive.

IMPORTANT: No Node.js APIs. Must run in Workers and Node. Standard JS/TS only.
```

---

## PROMPT 6: Web UI — Landing + Explore + Skill Detail

```
IMPORTANT: Before writing any frontend code, read the frontend design skill at /mnt/skills/public/frontend-design/SKILL.md and follow its guidelines for creating distinctive, production-grade UI. Apply its principles throughout all pages built in this prompt.

Build public web UI in packages/web. Use shadcn/ui + Tailwind CSS.

Install components:
  pnpm --filter @skvault/web dlx shadcn@latest add card button input tabs badge skeleton separator avatar dropdown-menu

1. Landing (app/routes/index.tsx):
   - Hero: "The package manager for AI agent skills"
   - Sub: "Version, scan, and ship skills for Claude Code, Cursor, Codex, Copilot, and 10+ agents."
   - Animated terminal: CSS keyframe typed text showing sk publish + sk add
   - 3 feature cards: versioning, scanning, private repos
   - Agent logos row
   - CTA → /login
   - Footer

2. Explore (app/routes/explore.tsx):
   - Server-side loader queries via Drizzle
   - Debounced search bar (URL params)
   - Sort tabs: Trending, Popular, Newest
   - Skill cards: owner/name, description, downloads, scan dot, version, time
   - Pagination
   - Empty state

3. Skill detail (app/routes/$owner.$name.tsx):
   - Loader: skill + latest version + scan
   - Header: name, avatar, description
   - Install box: `sk add owner/name` + copy button
   - Tabs: README | Versions | Scan Report
   - README: react-markdown + remark-gfm (pnpm --filter @skvault/web add react-markdown remark-gfm)
   - Sidebar: downloads, version, date, repo link

4. Version detail (app/routes/$owner.$name.$version.tsx):
   - Scan report + diff from previous

5. Layout (app/routes/__root.tsx):
   - Nav: logo, Explore, Docs, GitHub
   - Auth: avatar dropdown or "Sign in"
   - Dark mode default
   - Responsive

Skeleton loading. TanStack Start loaders for SSR.
```

---

## PROMPT 7: Web UI — Dashboard + Publish

```
IMPORTANT: Read the frontend design skill at /mnt/skills/public/frontend-design/SKILL.md before building any UI. Follow its guidelines for polished, production-grade design that avoids generic AI aesthetics.

Build dashboard in packages/web. All /dashboard/* use protected layout.

Install:
  pnpm --filter @skvault/web dlx shadcn@latest add table dialog alert-dialog toast switch progress textarea

1. Dashboard home (dashboard/index.tsx):
   Stats cards, recent activity, quick actions

2. Skills list (dashboard/skills/index.tsx):
   Table: name, visibility badge, version, downloads, scan, updated. Row click → settings.

3. Publish (dashboard/skills/new.tsx):
   Multi-step: name (live validate via @skvault/shared), description, visibility, upload .tar.gz, version, review + publish. Show scan results inline.

4. Settings (dashboard/skills/$name.tsx):
   Edit form, version actions (deprecate/yank), danger zone delete.

5. Tokens (dashboard/tokens.tsx):
   Table, create dialog, show once, revoke.

6. Account (dashboard/settings.tsx):
   Display name, avatar, username, password.

Loading spinners on submit. Toast on success/error. TanStack Start server functions.
```

---

## PROMPT 8: CLI — Core Commands

```
Build CLI in packages/cli. Depends on @skvault/shared.

1. Install:
   pnpm --filter skvault add commander chalk ora inquirer yaml tar-stream
   pnpm --filter skvault add -D @types/node @types/tar-stream

   tsup.config.ts already set up from Prompt 1.

2. Entry (src/index.ts): commander program, name "sk", version from package.json, register subcommands, global error handler.

3. Config (src/config.ts):
   - Follow XDG Base Directory spec:
     Primary: $XDG_CONFIG_HOME/skv/config.json (defaults to ~/.config/skv/config.json)
     Fallback: ~/.skvrc (for backward compat, read-only — new writes go to .config/skv/)
   - Config shape: { token, registry: "https://skv.sh", username }
   - getConfigDir(): resolve XDG path, create dir if missing
   - getConfig(), setConfig(partial), getToken(), setToken(token), clearToken()

4. HTTP client (src/api.ts): shared fetch. Bearer auth, User-Agent, 401 → "Run sk login", 429 → retry, network errors → friendly message.

5. Commands (src/commands/):

   login.ts — GitHub device flow or email fallback. Store token in ~/.config/skv/config.json.
   logout.ts — clear token.
   init.ts — write skillfile.yaml, update .gitignore.
   
   publish.ts — check SKILL.md, parseFrontmatter from @skvault/shared, prompt version, tar.gz (exclude node_modules/.git/.skills), SHA-256, upload, show scan results (chalk colored).
   
   add.ts — resolve version, download, verify hash, extract to .skills/store/{hash}/, symlink .skills/active/{name}, update skillfile.yaml + lockfile, symlink to agents.
   
   install.ts — read skillfile.yaml, resolve all, download, verify, extract, symlink. --frozen: lockfile only.
   
   update.ts — check newer versions, table output, prompt, swap symlinks, update lockfile.
   
   rollback.ts — swap symlink to previous hash.
   
   search.ts — GET /api/v1/skills?q=, print table.
   
   diff.ts — fetch diff API, colored output.
   
   token.ts — create/list/revoke subcommands.

6. Agents (src/agents.ts): detect installed agents by checking dirs. Symlink .skills/active/* into agent skill dirs.

7. Lockfile (src/lockfile.ts): read/write skillfile.lock YAML.

Verify:
- `pnpm build:cli` → dist/index.js with shebang
- `node packages/cli/dist/index.js --help` shows commands
```

---

## PROMPT 9: Scan Badge + Private Skills

```
Two features across packages/web and packages/cli.

1. Scan badge (packages/web/app/routes/api/v1/skills/$owner.$name.badge.svg.ts):
   - GET returns SVG (shields.io style): green pass, yellow warn, red fail, gray unknown
   - Cache in KV 5 min
   - Embed: ![scan](https://skv.sh/api/v1/skills/owner/name/badge.svg)

2. Private skills:
   Web: visibility controls access. Private + no auth → 404. Explore: public only. Dashboard: lock icon.
   CLI: skillfile.yaml `private: true`. sk add sends auth. sk publish --private. 401 → "Run sk login".

3. Token scoping: read = download private, publish = publish. Validate in requireToken.
```

---

## PROMPT 10: Polish + Deploy + Launch Prep

```
Final polish across all packages.

1. Errors: API returns { error, code }. CLI: try/catch, chalk.red, no stack traces. Timeouts: 30s upload, 10s read.

2. Loading: Suspense + Skeleton on data pages. Spinners on submits. Toast on mutations. Empty states with CTAs.

3. SEO: meta tags via TanStack Start. Skill pages: "{owner}/{name} — SKVault". Landing: "SKVault — The package manager for AI agent skills".

4. Domains in wrangler.toml: skvault.dev + skv.sh. Root skv.sh redirects to skvault.dev. API works on both.

5. Build check from root: `pnpm build` succeeds. `pnpm test` passes.

6. Seed (packages/web/scripts/seed.ts): 3 example skills. Run: pnpm --filter @skvault/web run seed

7. CLI npm prep: README, .npmignore (ship dist/ only), keywords, license.

8. Docs page (app/routes/docs.tsx): getting started, publishing, installing, private skills, scanning, skillfile ref, CLI ref.

9. Deploy:
   # Push secrets first (one-time per environment)
   wrangler secret put GITHUB_CLIENT_ID
   wrangler secret put GITHUB_CLIENT_SECRET
   wrangler secret put AUTH_SECRET
   wrangler secret put RESEND_API_KEY
   # Then deploy
   pnpm build
   pnpm test
   pnpm --filter @skvault/web run deploy
   pnpm --filter skvault publish --access public

10. Test: register → publish → sk add → sk update → sk rollback → private skill → token auth.
```
