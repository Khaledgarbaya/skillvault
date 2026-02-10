# Authentication Conventions

## Library

**better-auth** with Drizzle adapter on D1/SQLite.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth/server.ts` | better-auth config (providers, session, email) |
| `src/lib/auth/client.ts` | React client (`signIn`, `signUp`, `signOut`, `useSession`) |
| `src/lib/auth/middleware.ts` | `requireAuth`, `optionalAuth`, `requireToken`, `invalidateSessionCache` |
| `src/lib/email.ts` | Resend API wrapper with retry + idempotency |
| `src/routes/api/auth/$.ts` | Catch-all route — handles ALL better-auth endpoints |

## Cookie Cache Invalidation (Critical)

better-auth caches session data in a cookie (`cookieCache.maxAge: 300` = 5 minutes). After updating user profile fields on the server, you **MUST** invalidate the cache to prevent stale data:

```typescript
import { invalidateSessionCache } from "~/lib/auth/middleware";

// After any server-side user profile mutation:
invalidateSessionCache();
```

**Without this:** stale session data causes redirect loops and shows outdated profile values for up to 5 minutes.

**When to call it:**
- After updating username, displayName, avatarUrl, or any user field
- After changing email or email verification status
- After any server action that mutates user data read by `useSession()`

## Auth Strategies

1. **Session-based** (browser) — cookies, use `requireAuth(request)` / `optionalAuth(request)`
2. **Token-based** (CLI/API) — `Authorization: Bearer <token>`, use `requireToken(request, db)`

## Route Protection

Pathless layout routes (`_prefix.tsx`) enforce auth without adding URL segments.
All protected routes nest under `_protected/`.

```
src/routes/
├── __root.tsx              # Root layout (includes <Toaster />)
├── _protected.tsx          # Auth guard (redirects to /login)
├── _protected/
│   ├── dashboard.tsx       # Dashboard layout (sidebar + topbar + outlet)
│   └── dashboard/
│       ├── index.tsx       # Overview — stats, activity, recent skills
│       ├── skills/
│       │   ├── index.tsx   # Skills list table
│       │   ├── new.tsx     # Publish wizard (3-step)
│       │   └── $name.tsx   # Skill settings (edit, versions, delete)
│       ├── tokens.tsx      # API token management
│       └── settings.tsx    # Profile + password
├── login.tsx               # Public
├── register.tsx            # Public
├── forgot-password.tsx     # Public
├── reset-password.tsx      # Public
└── api/
    ├── auth/$.ts           # better-auth catch-all handler
    └── v1/auth/            # Custom API routes (me, tokens)
```

**`_protected.tsx`** — Pure auth check, no UI:

```tsx
export const Route = createFileRoute("/_protected")({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    return { user: session.user, session: session.session };
  },
  component: () => <Outlet />,
});
```

**Adding a new protected route:** Create a file under `_protected/` — it inherits
auth automatically. Access user via `Route.useRouteContext()` in any child:

```tsx
// src/routes/_protected/settings.tsx
export const Route = createFileRoute("/_protected/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  // user is guaranteed to exist — _protected.tsx already checked
}
```

**Key rules:**
- `_protected.tsx` handles ONLY auth — no nav bar, no UI chrome
- Layout routes like `dashboard.tsx` handle UI layout (nav, sidebar, etc.)
- `beforeLoad` context propagates to all children (`user`, `session`)
- Pathless prefix `_` means URL stays clean: `/_protected/dashboard` → `/dashboard`

## User Field Mapping

better-auth uses generic field names internally. Our mapping:

| better-auth field | DB column | Drizzle field |
|-------------------|-----------|---------------|
| `name` | `display_name` | `displayName` |
| `image` | `avatar_url` | `avatarUrl` |
| (additional) `username` | `username` | `username` |

## Environment Variables

Required in `.dev.vars` (local) or Cloudflare secrets (production):

```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
AUTH_SECRET          # 32+ char random string
RESEND_API_KEY       # re_...
```

`APP_URL` is set in `wrangler.toml` `[vars]`.

## Email Sending

- Plain `fetch` to Resend API (no SDK)
- Idempotency keys prevent duplicate sends: `email-verify-{userId}-{token}`, `password-reset-{userId}-{token}`
- Retry with exponential backoff (3 attempts, 5xx/429 only)
- From: `hello@mail.skvault.dev`, Reply-To: `support@skvault.dev`
