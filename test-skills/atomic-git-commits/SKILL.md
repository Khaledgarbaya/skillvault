---
name: atomic-git-commits
description: "Write atomic, human-reviewable git commits — one logical change per commit with clear conventional messages"
version: 1.0.4
---

# Atomic Git Commits

Write atomic, human-reviewable git commits. Each commit should represent one logical change that can be understood, reviewed, and reverted independently.

## What Makes a Commit Atomic

An atomic commit:
- Contains **one logical change** — not "fix bug and also refactor and update deps"
- **Builds successfully** at every point in history — no broken intermediate states
- Can be **reverted independently** without side effects on unrelated code
- Has a **clear, descriptive message** that explains the why, not just the what

## Commit Message Format

Use Conventional Commits with scope:

```
<type>(<scope>): <subject>

<body — optional, explains WHY>

Co-Authored-By: Name <email>
```

### Types

| Type | When to Use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Build, CI, dependency updates |
| `perf` | Performance improvement |

### Subject Line Rules

- **Imperative mood**: "add feature" not "added feature" or "adds feature"
- **Under 70 characters** — details go in the body
- **Lowercase first word** after the colon
- **No trailing period**

### Examples

```
feat(web): add session timeout with configurable TTL

refactor(web): replace stateless logger with wide event Logger class

fix(cli): handle 429 rate limit with exponential backoff

docs: add server functions middleware documentation
```

## Splitting Work into Atomic Commits

### Strategy: Layer by Dependency

When refactoring, commit in dependency order so each commit compiles:

```
1. feat(shared): add new validation types        ← foundation
2. refactor(web): update middleware to use types  ← consumer
3. feat(web): enrich auth middleware with logger  ← integration
```

### Strategy: Separate Mechanism from Policy

```
1. refactor(web): extract Logger class            ← mechanism (the tool)
2. refactor(web): wire Logger into middleware      ← policy (how it's used)
3. feat(web): add user identity to wide events    ← enrichment
```

### Strategy: Infrastructure then Features

```
1. chore(web): add rate limiting middleware       ← infrastructure
2. feat(api): apply rate limits to publish route  ← feature using it
```

## What NOT to Do

### Don't mix concerns

```
# Bad — two unrelated changes in one commit
git commit -m "fix login bug and update README"

# Good — separate commits
git commit -m "fix(auth): validate email before session create"
git commit -m "docs: update README with auth setup instructions"
```

### Don't commit broken intermediate states

```
# Bad — breaks the build between commits
commit 1: "remove old auth module"       ← build breaks here
commit 2: "add new auth module"          ← build works again

# Good — atomic swap
commit 1: "refactor(auth): replace old auth with better-auth"
```

### Don't commit generated files with source changes

```
# Bad — noise in the diff
commit: "feat(web): add dashboard route"
  + src/routes/dashboard.tsx          ← your code
  + src/routeTree.gen.ts              ← auto-generated noise

# Good — separate or .gitignore generated files
commit: "feat(web): add dashboard route"
  + src/routes/dashboard.tsx
```

## Staging Specific Files

Always stage explicitly — avoid `git add -A` which can catch secrets or generated files:

```bash
# Stage specific files for this logical change
git add src/lib/logger.ts src/lib/middleware/types.ts

# Commit with heredoc for multi-line messages
git commit -m "$(cat <<'EOF'
refactor(web): replace stateless logger with wide event Logger class

Introduce a Logger class that accumulates context throughout a request
lifecycle and flushes a single canonical log line.

Co-Authored-By: Name <email>
EOF
)"
```

## Review Checklist

Before each commit, verify:

- [ ] `git diff --staged` shows only changes related to this commit's purpose
- [ ] The commit message accurately describes the change
- [ ] The project builds after this commit
- [ ] No unrelated formatting, whitespace, or import changes snuck in
- [ ] No secrets, `.env` files, or large binaries are staged
- [ ] The commit can be understood in isolation during code review

## Interactive Rebase for Cleanup

If you made messy WIP commits, clean up before pushing:

```bash
# Squash/reorder last N commits
git rebase -i HEAD~N

# In the editor:
pick abc1234 feat(web): add Logger class
squash def5678 wip: fix typo in Logger     ← squash into previous
pick ghi9012 refactor(web): wire Logger into middleware
drop jkl3456 debug: add console.log        ← drop entirely
```

**Important**: Only rebase commits that haven't been pushed. Never rebase shared history.

## Practical Example: Refactoring a Logger

Given a task to refactor a stateless logger into a wide event Logger class that touches 5 files, split into 3 atomic commits:

| Commit | Files | Purpose |
|--------|-------|---------|
| 1. `refactor: replace logger with Logger class` | `logger.ts`, `types.ts` | Core abstraction + type update |
| 2. `refactor: simplify logging middleware` | `with-logging.ts` | Main consumer of new Logger |
| 3. `feat: enrich wide events with user identity` | `auth.ts`, `index.ts` | Auth integration + re-export |

Each commit:
- Compiles independently
- Contains one logical change
- Can be reviewed in isolation
- Tells a clear story when read in sequence
