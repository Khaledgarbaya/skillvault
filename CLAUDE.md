# skscan — Security Scanner for AI Agent Skills

Monorepo: `apps/web` (TanStack Start on Cloudflare Workers), `apps/cli` (skscan CLI), `packages/scanner` (@skvault/scanner — scanner engine, MIT)

## Setup

- Package manager: **pnpm** — Node 22 (see `.nvmrc`)
- **Always run `nvm use` before building or running dev.** Vite 7 requires Node 20.19+ or 22.12+. Wrong Node version = build failure.
- Install: `pnpm install`

## Commands (run from root)

```
nvm use               # ALWAYS first — ensure correct Node version
pnpm build            # scanner → web + cli (scanner must build first)
pnpm dev              # web dev server (Vite) at localhost:5690
pnpm db:generate      # generate Drizzle migrations
pnpm db:migrate       # apply migrations to local D1
pnpm --filter @skvault/web exec tsc --noEmit  # typecheck web
```

## Architecture Overview

### Scanner Engine (`packages/scanner`)

- Platform-agnostic TypeScript (no Node.js APIs), runs in Node + Cloudflare Workers
- Entry: `scanSkill(files: SkillFile[], config?: ScanConfig) → ScanResult`
- 29 rules across 5 categories: secrets, dangerous-code, prompt-override, exfiltration, hidden-instructions
- Rule IDs: `category/rule-name` format (e.g., `secrets/aws-key`)
- Built with tsup (ESM + CJS + dts), `type: "module"` → `.js` = ESM, `.cjs` = CJS

### CLI (`apps/cli`)

- `skscan` binary — 3 commands: `scan` (default), `init`, `ci`
- Built with tsup, bundles `@skvault/scanner` via `noExternal`
- Commander.js for CLI framework, chalk for colors, yaml for config parsing

### Web (`apps/web`)

- TanStack Start on Cloudflare Workers
- **Landing page** at `/` — marketing page for skscan
- **Scan API** at `POST /api/v1/scan` — accepts `{ files, config? }`, returns `ScanResult`
- **Badge API** at `GET /api/v1/badge/:provider/:owner/:repo` — returns SVG badge
- Auth pages (login, register, forgot-password, reset-password) — for future cloud dashboard
- D1 database: auth tables + `scanRecords` table
- KV: `BADGE_CACHE` for badge caching (5min TTL) and rate limiting (60/hr)

## Server Functions & Middleware

### Middleware Chain (Required)

All server functions use the full middleware chain:

```typescript
// Authenticated operations
.middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])

// Scope-restricted operations (token auth)
.middleware([loggingMiddleware, cloudflareMiddleware, requireScope('publish')])
```

Never use manual auth checks like `auth.api.getSession()` in handlers — always use middleware.

### Cloudflare Environment Access

Middleware provides typed access to D1 and KV:

```typescript
import { cloudflareMiddleware } from "~/lib/middleware/cloudflare";

// context.cloudflare.env gives you DB, BADGE_CACHE, and all secrets
const db = drizzle(context.cloudflare.env.DB);
```

**NEVER import `cloudflare:workers` or `auth/server` at the top level of files that TanStack Start bundles for the client.** Use the `createAuth(env)` factory with runtime env from middleware context instead.

### Typed Context

Use `LoggedAuthContext` from `src/lib/middleware/types.ts`:

```typescript
import type { LoggedAuthContext } from "~/lib/middleware/types";
```

`CloudflareEnv` is the single source of truth for all bindings: `DB` (D1), `BADGE_CACHE` (KV), and secrets (`AUTH_SECRET`, `RESEND_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).

### API Route Handlers

Server route handlers (`server.handlers`) use inline helpers for auth:

```typescript
import { requireScopeFromRequest } from "~/lib/middleware";
const authResult = await requireScopeFromRequest(request, "publish");
```

For direct auth operations:

```typescript
import { createAuth } from "~/lib/auth/server";
const auth = createAuth(context.cloudflare.env);
```

## Open-Source & Secret Safety

This project is **fully open-source**. Every file, every commit, every piece of git history is public. Treat all code as if it's already on the front page of Hacker News.

- **Never hardcode secrets, API keys, tokens, or credentials** in tracked files. Use `.dev.vars` (local) or Cloudflare secrets (production) for anything sensitive.
- **`VITE_PUBLIC_*` vars are intentionally public** (write-only client keys like PostHog). Everything else stays out of git.
- **Run `gitleaks detect --verbose` before staging and committing.** If gitleaks flags something, stop and evaluate before adding it to history — git history is permanent.
- **`.gitleaksignore`** allowlists scanner test fixture fingerprints (dummy secrets used in tests). Update it if new test fixtures trigger false positives.
- **Never commit** `.dev.vars`, `.env`, credentials, private keys, or OAuth secrets. Verify `.gitignore` covers new secret files.

## Domain References

When working in a specific area, read the relevant doc for conventions:

- [TanStack Start / Routing](.claude/docs/tanstack-start.md) — routes, API handlers, layouts
- [Database / Drizzle](.claude/docs/database.md) — schema, D1 constraints, migrations
- [Cloudflare Workers](.claude/docs/cloudflare.md) — bindings, secrets, deploy
- [UI / shadcn](.claude/docs/ui.md) — components, Tailwind v4, dark mode
- [Authentication](.claude/docs/auth.md) — better-auth, session cache, email, protected routes
- [Server Functions / Middleware](.claude/docs/server-functions.md) — middleware chain, typed context, auth
