---
name: tanstack-start-cloudflare
description: "Build full-stack apps with TanStack Start on Cloudflare Workers — routing, server functions, middleware, better-auth, Drizzle ORM with D1"
version: 1.0.0
---

# TanStack Start on Cloudflare Workers

Build full-stack TypeScript apps with TanStack Start deployed to Cloudflare Workers. Covers routing, server functions with middleware, authentication via better-auth, and Drizzle ORM with D1.

## Stack Overview

- **Framework**: TanStack Start (stable v1.x) — file-based routing, SSR, server functions
- **Runtime**: Cloudflare Workers — edge compute, no cold starts
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM
- **Auth**: better-auth with session + token strategies
- **Bundler**: Vite 7 with Cloudflare plugin
- **UI**: React 19 + Tailwind CSS v4 + shadcn/ui

## Project Structure

```
src/
├── routes/              # File-based routes (TanStack Router)
│   ├── __root.tsx       # Root layout — html, head, body
│   ├── index.tsx        # Landing page
│   ├── _protected.tsx   # Auth guard layout (pathless)
│   ├── _protected/      # All authenticated routes
│   │   └── dashboard/
│   └── api/             # API route handlers
│       └── v1/
├── lib/
│   ├── auth/            # better-auth config (server, client, middleware)
│   ├── db/              # Drizzle schema + queries
│   ├── middleware/       # Composable middleware (logging, cloudflare, auth)
│   └── api/             # API helpers (response builders, logging)
├── components/          # React components
├── styles/              # Tailwind CSS
└── router.tsx           # Router config — exports getRouter()
```

## Server Functions with Middleware

Server functions use `createServerFn` with a composable middleware chain:

```typescript
import { createServerFn } from "@tanstack/react-start";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  authMiddleware,
} from "~/lib/middleware";

// Authenticated operation
export const getMySkills = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .handler(async ({ context }) => {
    // context.cloudflare.env — typed bindings (DB, R2, KV)
    // context.session.user — authenticated user
    // context.logger — request-scoped logger
    const db = drizzle(context.cloudflare.env.DB);
    return db.select().from(skills)
      .where(eq(skills.ownerId, context.session.user.id));
  });
```

### Middleware Chain Order

1. **loggingMiddleware** — creates Logger, starts timer, flushes wide event on completion
2. **cloudflareMiddleware** — exposes `env` bindings (DB, SKILLS_BUCKET, CACHE)
3. **authMiddleware** — validates session, enriches logger with user identity

### Typed Context

```typescript
import type { LoggedAuthContext } from "~/lib/middleware/types";

// Handler receives the accumulated context from all middleware
.handler(async ({ context }: { context: LoggedAuthContext }) => {
  context.cloudflare.env.DB;       // D1Database
  context.cloudflare.env.SKILLS_BUCKET; // R2Bucket
  context.session.user.id;         // string
  context.logger;                  // Logger instance
});
```

### Input Validation

```typescript
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([loggingMiddleware, cloudflareMiddleware, authMiddleware])
  .validator((data: { displayName: string }) => data)
  .handler(async ({ context, data }) => {
    // data is typed as { displayName: string }
  });
```

## Cloudflare Environment

### Bindings (wrangler.toml)

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-db"

[[r2_buckets]]
binding = "SKILLS_BUCKET"
bucket_name = "my-bucket"

[[kv_namespaces]]
binding = "CACHE"
id = "abc123"
```

### Access in Server Functions

Middleware provides typed access — never import `env` directly in handlers:

```typescript
// Correct — use middleware context
const db = drizzle(context.cloudflare.env.DB);

// Wrong — don't do this in handlers
import { env } from "cloudflare:workers"; // only for middleware internals
```

### Type Definition

Define once in `src/lib/middleware/types.ts`:

```typescript
export interface CloudflareEnv {
  DB: D1Database;
  SKILLS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  APP_URL: string;
}
```

## Authentication with better-auth

### Server Config

```typescript
// src/lib/auth/server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(drizzle(env.DB), { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
});
```

### Catch-All Route

```typescript
// src/routes/api/auth/$.ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "~/lib/auth/server";

export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: ({ request }) => auth.handler(request),
  POST: ({ request }) => auth.handler(request),
});
```

### Protected Routes

Use a pathless layout route as an auth guard:

```typescript
// src/routes/_protected.tsx
export const Route = createFileRoute("/_protected")({
  beforeLoad: async () => {
    const session = await checkAuthFn();
    if (!session) throw redirect({ to: "/login" });
    return { session };
  },
  component: () => <Outlet />, // Just passes through
});
```

All routes under `_protected/` inherit the guard automatically.

## Drizzle ORM with D1

### Schema Definition

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### D1 Constraints

- Use `db.batch()` not `db.transaction()` — D1 doesn't support SQL BEGIN/COMMIT
- Use `integer` with `mode: 'timestamp'` for dates (no native DATE type in SQLite)
- Foreign keys use `onDelete: 'cascade'` for cleanup

### Queries

```typescript
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

const db = drizzle(context.cloudflare.env.DB);
const result = await db.select().from(users).where(eq(users.id, userId));
```

## Vite Configuration

```typescript
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
  ],
});
```

## Key Gotchas

1. **Node version**: Vite 7 requires Node 20.19+ or 22.12+. Always `nvm use`.
2. **Route tree**: `routeTree.gen.ts` auto-generates on first `pnpm dev`.
3. **CSS imports**: Use `?url` suffix — `import appCss from "../styles/app.css?url"`.
4. **Tailwind v4 plugins**: Use `@plugin "@tailwindcss/typography"` not `@import`.
5. **Wrangler entry**: Set `main = "@tanstack/react-start/server-entry"`.
6. **Peer deps**: Set `strict-peer-dependencies=false` in `.npmrc` for TanStack ecosystem.
