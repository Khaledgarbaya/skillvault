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

## API Route Pattern

API routes use `server.handlers` — no separate API framework:

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

## Root Layout

`src/routes/__root.tsx` — uses `createRootRoute` with `HeadContent`, `Outlet`, `Scripts`.
CSS loaded via: `import appCss from "../styles/app.css?url"` then added as a `<link>` in `head`.

## Router

`src/router.tsx` exports `getRouter()`. Type registration via `declare module "@tanstack/react-router"` with `Register` interface.
