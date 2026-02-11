# Cloudflare Workers

Config: `apps/web/wrangler.toml`

## Bindings

| Binding          | Type | Purpose            |
|------------------|------|--------------------|
| `DB`             | D1   | SQLite database    |
| `SKILLS_BUCKET`  | R2   | Skill tarball storage |
| `CACHE`          | KV   | Cache layer        |

## Secrets

Stored in `apps/web/.dev.vars` (gitignored) for local dev:

- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — OAuth
- `AUTH_SECRET` — session signing
- `RESEND_API_KEY` — email

For production, set via: `wrangler secret put <NAME>`

All secrets are included in `CloudflareEnv` (`src/lib/middleware/types.ts`) alongside bindings. Access them via `context.cloudflare.env` from middleware context — **never** via top-level `import { env } from "cloudflare:workers"` in files that touch the client bundle.

## Entry Point

`main = "@tanstack/react-start/server-entry"` — do not change this.

## Compatibility

- `compatibility_flags = ["nodejs_compat"]`
- Vite plugin: `cloudflare({ viteEnvironment: { name: "ssr" } })`

## Deploy

```
pnpm --filter @skvault/web deploy   # runs wrangler deploy
```
