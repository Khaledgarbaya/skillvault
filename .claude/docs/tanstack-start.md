# TanStack Start Conventions

All web app code lives in `apps/web/src/`.

## Routing

- Routes live in `src/routes/` — file-based routing
- `src/routeTree.gen.ts` is **auto-generated** — never edit it manually
- Path alias: `~/` maps to `src/` (configured in tsconfig)

## Page Route Pattern

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/path")({
  component: MyComponent,
});

function MyComponent() {
  return <div>...</div>;
}
```

## Server Functions vs Server Routes

Choose the right tool based on who calls it:

| Use | When | Why |
|-----|------|-----|
| **Server functions** (`createServerFn`) | Mutations and internal data fetching | Typed RPC, auto auth context, no public URL surface |
| **Server routes** (`server.handlers`) | Webhooks, mobile/3rd-party APIs, file upload/download, streaming | Need a callable URL that external consumers can hit |
| **`loader` / SSR** | Initial page data, SEO-critical content | Runs on first render, good for static/cacheable data |

**Rule of thumb:**
- **Mutations** → always server functions
- **Fetching for the app** → server functions (cache with TanStack Query if needed, GET is fine)
- **Fetching that needs a public URL** → server routes
- **Streaming / range requests / CDN caching** → server routes
- **Don't do infinite scroll in loaders** — use server functions + client-side fetching instead

Server functions give you types, auth context, and avoid accidentally turning internal RPC into a public API.

### Server Function Pattern

```ts
import { createServerFn } from "@tanstack/react-start";

const getSkills = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await requireAuth(request!);
    // typed, authed, no public URL
    return db.select().from(skills).where(eq(skills.ownerId, session.user.id));
  },
);
```

### Server Route Pattern (API)

Only for endpoints that external consumers need to call:

```ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/v1/example")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true });
      },
    },
  },
});
```

## Pathless Layout Routes

Prefix a file with `_` to create a layout that wraps children **without adding a URL segment**.
Used for auth guards, role checks, or shared UI shells.

```
_protected.tsx          → beforeLoad checks auth, renders <Outlet />
_protected/dashboard/   → URL is /dashboard (not /_protected/dashboard)
```

- `beforeLoad` context propagates to all nested children
- Children access it via `Route.useRouteContext()`
- See [auth.md](./auth.md) for the `_protected` pattern in use

## Root Layout

`src/routes/__root.tsx` — uses `createRootRoute` with `HeadContent`, `Outlet`, `Scripts`.
CSS loaded via: `import appCss from "../styles/app.css?url"` then added as a `<link>` in `head`.

## Router

`src/router.tsx` exports `getRouter()`. Type registration via `declare module "@tanstack/react-router"` with `Register` interface.
