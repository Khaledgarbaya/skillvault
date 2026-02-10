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

## Entry Point

`main = "@tanstack/react-start/server-entry"` — do not change this.

## Compatibility

- `compatibility_flags = ["nodejs_compat"]`
- Vite plugin: `cloudflare({ viteEnvironment: { name: "ssr" } })`

## Deploy

```
pnpm --filter @skvault/web deploy   # runs wrangler deploy
```
