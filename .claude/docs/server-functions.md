# Server Functions & Middleware

## Middleware Chain

All server functions use composable middleware that passes typed context:

```typescript
import { loggingMiddleware, cloudflareMiddleware, authMiddleware } from "~/lib/middleware";
import type { LoggedAuthContext } from "~/lib/middleware";

export const myFn = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }: { context: LoggedAuthContext }) => {
    const db = drizzle(context.cloudflare.env.DB);
    // context.session.user — authenticated user
    // context.logger — request-scoped logger
  });
```

### Middleware ordering

Always use this order: `loggingMiddleware` → `cloudflareMiddleware` → `authMiddleware`

- `loggingMiddleware` — creates request-scoped logger, emits wide event log line
- `cloudflareMiddleware` — passes `{ cloudflare: { env } }` with D1, R2, KV bindings
- `authMiddleware` — validates session, passes `{ session }` or throws

### Typed context

| Type | Includes | Use when |
|------|----------|----------|
| `LoggedAuthContext` | cloudflare env + session + logger | Authenticated operations (most server fns) |
| `LoggedContext` | cloudflare env + logger | Public/unauthenticated operations |

Types are defined in `src/lib/middleware/types.ts`. `CloudflareEnv` is the single source of truth for all Cloudflare bindings.

## With inputValidator

Place `.inputValidator()` after `.middleware()`:

```typescript
export const updateSkill = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .inputValidator((data: { skillId: string; name: string }) => data)
  .handler(async ({ context, data }: { context: LoggedAuthContext; data: { skillId: string; name: string } }) => {
    // data is typed from inputValidator
  });
```

## Accessing request in handlers

The handler always receives `request` as a top-level arg alongside `context` and `data`:

```typescript
.handler(async ({ request, context, data }) => {
  // request is the raw Request object
  // context comes from middleware
  // data comes from inputValidator
});
```

## Server Functions vs Server Routes

| Use | When | Why |
|-----|------|-----|
| **Server functions** (`createServerFn`) | Mutations and internal data fetching | Typed RPC, middleware context, no public URL |
| **Server routes** (`server.handlers`) | Webhooks, external APIs, streaming | Need a callable URL for external consumers |

Server functions get middleware context. Server routes do NOT — they use inline auth helpers from `lib/auth/middleware.ts` instead.

## Client Hook Pattern

Queries in `src/lib/queries/use*.ts`, server functions in `src/lib/queries/server/*.ts`:

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

## File locations

| File | Purpose |
|------|---------|
| `src/lib/middleware/types.ts` | `CloudflareEnv`, `LoggedAuthContext`, `RequestLogger` |
| `src/lib/middleware/cloudflare.ts` | Passes `{ cloudflare: { env } }` context |
| `src/lib/middleware/auth.ts` | Passes `{ session }` context |
| `src/lib/middleware/index.ts` | Barrel re-exports |
| `src/lib/api/with-logging.ts` | `loggingMiddleware` — passes `{ logger }` context |
| `src/lib/dashboard-fns.ts` | All dashboard server functions |
| `src/lib/auth/middleware.ts` | Auth helpers for API routes (NOT middleware context) |
