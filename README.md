# SKVault

The package manager for AI agent skills. Publish, discover, and install reusable skills for AI coding agents. Version-controlled, security-scanned, ready to use.

## What is SKVault?

SKVault is a skill registry that lets developers publish and share reusable skills (prompt templates, tool configs, workflows) for AI coding agents like Claude Code, Cursor, Codex, GitHub Copilot, and others.

Every published version is automatically scanned for secrets, unsafe permissions, network access, and filesystem risks.

## Architecture

Monorepo with three packages:

```
apps/
  web/     @skvault/web   — Web registry + API (TanStack Start, Cloudflare Workers, D1)
  cli/     skvault        — CLI tool (`sk` binary)
packages/
  shared/  @skvault/scanner — Shared types + validation + security scanner
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TanStack Start (React), Tailwind v4, shadcn/ui |
| Backend | Cloudflare Workers (edge) |
| Database | Cloudflare D1 (SQLite), Drizzle ORM |
| Auth | better-auth (session + token-based) |
| CLI | Node.js, tsup |

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 9+
- Wrangler CLI (for Cloudflare D1 local dev)

### Setup

```bash
# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Create local D1 database and run migrations
pnpm db:migrate

# Build shared package first (required before web/cli)
pnpm build:shared

# Start dev server
pnpm dev
```

The web app runs at `http://localhost:3000`.

### Commands

```bash
nvm use               # Always first — ensure correct Node version
pnpm build            # Build all packages (shared -> web + cli)
pnpm dev              # Web dev server (Vite)
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Apply migrations to local D1
```

## CLI Usage

```bash
# Install the CLI
npm install -g skvault

# Publish a skill
sk publish

# Install a skill
sk add owner/skill-name

# Install a specific version
sk add owner/skill-name@1.2.0
```

## API

The web app exposes a REST API at `/api/v1/`:

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/skills` | List public skills |
| `GET /api/v1/skills/:owner/:name` | Get skill details |
| `GET /api/v1/skills/:owner/:name/versions` | List versions |
| `GET /api/v1/skills/:owner/:name/:version` | Get version details |
| `GET /api/v1/skills/:owner/:name/:version/dl` | Download version |
| `POST /api/v1/skills/:owner/:name/publish` | Publish new version |
| `GET /api/v1/skills/:owner/:name/diff/:v1/:v2` | Diff two versions |
| `GET /api/v1/auth/me` | Current user info |
| `POST /api/v1/auth/tokens` | Create API token |
| `DELETE /api/v1/auth/tokens/:id` | Revoke API token |

## Security Scanning

Every published skill version is automatically scanned across four categories:

- **Secrets** — API keys, tokens, credentials in source files
- **Permissions** — Dangerous or overly broad permission requests
- **Network** — Unauthorized external network access patterns
- **Filesystem** — Unsafe filesystem operations or path traversals

Scan results are displayed on skill detail pages with pass/warn/fail status per category.

## Environment Variables

Create `apps/web/.dev.vars` for local development:

```
AUTH_SECRET=your-auth-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
RESEND_API_KEY=your-resend-api-key
```

## License

Private
