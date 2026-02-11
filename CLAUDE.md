# SKVault — Skill Registry for AI Agents

Monorepo: `apps/web` (TanStack Start on Cloudflare Workers), `apps/cli` (Node CLI), `packages/shared` (types + validation)

## Setup

- Package manager: **pnpm** — Node 22 (see `.nvmrc`)
- **Always run `nvm use` before building or running dev.** Vite 7 requires Node 20.19+ or 22.12+. Wrong Node version = build failure.
- Install: `pnpm install`

## Commands (run from root)

```
nvm use               # ALWAYS first — ensure correct Node version
pnpm build            # shared → web + cli (shared must build first)
pnpm dev              # web dev server (Vite)
pnpm db:generate      # generate Drizzle migrations
pnpm db:migrate       # apply migrations to local D1
pnpm --filter @skvault/web exec tsc --noEmit  # typecheck web
```

## Server Functions & Middleware

### Middleware Chain (Required)

All server functions use the full middleware chain:

```typescript
// Authenticated operations
.middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])

// Scope-restricted operations (token auth)
.middleware([loggingMiddleware, cloudflareMiddleware, requireScope('publish')])
.middleware([loggingMiddleware, cloudflareMiddleware, requireScope('read')])
```

Never use manual auth checks like `auth.api.getSession()` in handlers — always use middleware.

**Middleware CANNOT call server functions.** They must directly access the environment and fetch session. See `src/lib/middleware/auth.ts` for the correct pattern.

### Cloudflare Environment Access

Middleware provides typed access to D1, R2, and KV:

```typescript
import { cloudflareMiddleware } from "~/lib/middleware/cloudflare";

// context.cloudflare.env gives you DB, SKILLS_BUCKET, CACHE, and all secrets
const db = drizzle(context.cloudflare.env.DB);
const auth = createAuth(context.cloudflare.env);
```

**NEVER import `cloudflare:workers` or `auth/server` at the top level of files that TanStack Start bundles for the client.** Use the `createAuth(env)` factory with runtime env from middleware context instead. See [Authentication](.claude/docs/auth.md) for details.

### Typed Context

Use `LoggedAuthContext` from `src/lib/middleware/types.ts`:

```typescript
import type { LoggedAuthContext } from "~/lib/middleware/types";

export const myFn = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }: { context: LoggedAuthContext; data: MyData }) => {
    // context.cloudflare.env — typed with all bindings (DB, SKILLS_BUCKET, CACHE)
    // context.session.user — typed with user fields
    // context.logger — typed logger instance
  });
```

`CloudflareEnv` is the single source of truth for all bindings and secrets, defined in `src/lib/middleware/types.ts`.

### Client Hook Pattern

Queries go in `src/lib/queries/use*.ts`, server functions in `src/lib/queries/server/*.ts`:

```typescript
// Client hook
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: () => getSkillsFn(),
  });
}

// Server function
export const getSkillsFn = createServerFn({ method: 'GET' })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }) => {
    const db = drizzle(context.cloudflare.env.DB);
    return db.select().from(skills).where(eq(skills.ownerId, context.session.user.id));
  });
```

Toast notifications: `sonner` with `toast.success()` / `toast.error()` (hardcode `theme="dark"`).

### Access Control

**Server functions** use middleware — `authMiddleware` or `requireScope('...')` (see middleware chain above).

**API route handlers** (`server.handlers`) use inline helpers from `src/lib/middleware/auth.ts`:

```typescript
import { requireScopeFromRequest, optionalScopeFromRequest } from "~/lib/middleware";

// These get env from cloudflare:workers internally (server-only context)
const authResult = await requireScopeFromRequest(request, "publish");
```

For direct auth operations in route handlers, use the `createAuth` factory:

```typescript
import { createAuth } from "~/lib/auth/server";

const auth = createAuth(context.cloudflare.env);
const session = await auth.api.getSession({ headers: request.headers });
```

## Domain References

When working in a specific area, read the relevant doc for conventions:

- [TanStack Start / Routing](.claude/docs/tanstack-start.md) — routes, API handlers, layouts
- [Database / Drizzle](.claude/docs/database.md) — schema, D1 constraints, migrations
- [Cloudflare Workers](.claude/docs/cloudflare.md) — bindings, secrets, deploy
- [UI / shadcn](.claude/docs/ui.md) — components, Tailwind v4, dark mode
- [Authentication](.claude/docs/auth.md) — better-auth, session cache, email, protected routes
- [Server Functions / Middleware](.claude/docs/server-functions.md) — middleware chain, typed context, auth
