# Database — Drizzle ORM + Cloudflare D1

## Schema

Schema file: `apps/web/src/lib/db/schema.ts`

Tables: `users`, `skills`, `skillVersions` (`skill_versions`), `scanResults` (`scan_results`), `apiTokens` (`api_tokens`), `installEvents` (`install_events`)

## D1 Constraints

- **No transactions**: use `db.batch([...])` instead of `db.transaction()`
- D1 is SQLite — no native `RETURNING *` in all contexts; batch multiple statements instead

## Conventions

- **IDs**: `text("id").primaryKey()` — generate UUIDs in app code, not auto-increment
- **Timestamps**: `integer("col", { mode: "timestamp" }).notNull().$defaultFn(() => new Date())`
- **Foreign keys**: always include `onDelete: "cascade"`
- **Column naming**: snake_case in SQL (`owner_id`), camelCase in TypeScript (`ownerId`)

## DB Factory

```ts
import { createDb } from "~/lib/db";
const db = createDb(env.DB); // env.DB is the D1 binding
```

## Migrations

```
pnpm db:generate   # creates migration SQL in apps/web/drizzle/
pnpm db:migrate    # applies migrations to local D1
```
