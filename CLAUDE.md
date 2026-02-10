# SKVault — Skill Registry for AI Agents

Monorepo: `apps/web` (TanStack Start on Cloudflare Workers), `apps/cli` (Node CLI), `packages/shared` (types + validation)

## Setup

- Package manager: **pnpm** — Node 22 (see `.nvmrc`)
- Install: `pnpm install`

## Commands (run from root)

```
pnpm build            # shared → web + cli (shared must build first)
pnpm dev              # web dev server (Vite)
pnpm db:generate      # generate Drizzle migrations
pnpm db:migrate       # apply migrations to local D1
pnpm --filter @skvault/web exec tsc --noEmit  # typecheck web
```

## Domain References

When working in a specific area, read the relevant doc for conventions:

- [TanStack Start / Routing](.claude/docs/tanstack-start.md) — routes, API handlers, layouts
- [Database / Drizzle](.claude/docs/database.md) — schema, D1 constraints, migrations
- [Cloudflare Workers](.claude/docs/cloudflare.md) — bindings, secrets, deploy
- [UI / shadcn](.claude/docs/ui.md) — components, Tailwind v4, dark mode
