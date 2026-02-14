# skscan — Claude Code Prompts (Refactoring Existing Project)

The skillvault monorepo already exists with apps/cli, apps/web, packages/shared, working config, secrets, and wrangler setup. These prompts refactor it from a skill registry to an open-source skill security scanner.

Read the PRD at prds/prd-skscan-launch.md before starting. Run `pnpm build && pnpm test` between prompts.

---

## PROMPT 1: Rename packages/shared → packages/scanner + Build Scanner Engine

```
We're pivoting skillvault from a skill registry to an open-source security scanner for AI agent skills. Read prds/prd-skscan-launch.md for full context.

This prompt renames and refactors the shared package into a standalone scanner engine.

1. Rename packages/shared → packages/scanner:
   - Rename the directory: mv packages/shared packages/scanner
   - Update package.json inside it: name "@skvault/scanner"
   - Add npm publish fields to package.json:
     "description": "Security scanner engine for AI agent skills",
     "license": "MIT",
     "main": "dist/index.js",
     "module": "dist/index.mjs",
     "types": "dist/index.d.ts",
     "files": ["dist"],
     "exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.js", "types": "./dist/index.d.ts" } },
     "repository": { "type": "git", "url": "https://github.com/skvault/skscan", "directory": "packages/scanner" },
     "keywords": ["ai", "agent", "skills", "security", "scanner", "prompt-injection"]
   - Update pnpm-workspace.yaml if needed (should already glob packages/*)
   - Update root package.json: "build:scanner": "pnpm --filter @skvault/scanner build"
   - Update apps/cli/package.json: "@skvault/scanner": "workspace:*" (was @skvault/shared)
   - Update apps/web/package.json: "@skvault/scanner": "workspace:*" (was @skvault/shared)
   - Find and replace ALL imports across the codebase: "@skvault/shared" → "@skvault/scanner"
   - Run pnpm install to update lockfile
   - Remove all registry-related types and code: skill versioning, tarball handling, lockfile parsing, skillfile.yaml types, install/publish types, R2/storage types
   - Keep the tsup.config.ts and build setup

2. Add scanner types in packages/scanner/src/types.ts (exact types from PRD):
   - SkillFile: { path: string, content: string }
   - ScanConfig: { rules?: Record<string, "off"|"warn"|"error">, ignore?: string[] }
   - ScanFinding: { ruleId, severity, category, file, line, column?, message, snippet }
   - ScanResult: { status, summary, findings, categories, scannedFiles, scanDuration, engineVersion }
   - severity: "low" | "medium" | "high" | "critical"
   - category: "secrets" | "dangerous-code" | "prompt-override" | "exfiltration" | "hidden-instructions"

3. Implement all scan rules. Each rule is a function that takes file content and returns ScanFinding[].

   packages/scanner/src/rules/secrets.ts — 7 rules (scan non-.md files only):
   - secrets/aws-key: AKIA[0-9A-Z]{16}
   - secrets/github-token: ghp_, gho_, ghs_, ghr_ + alphanumeric
   - secrets/generic-api-key: api_key=, api-key:, apikey=, API_KEY= with value
   - secrets/private-key: BEGIN RSA/OPENSSH/EC PRIVATE KEY
   - secrets/slack-token: xoxb-, xoxp-, xoxs-
   - secrets/high-entropy: Shannon entropy > 4.5 on strings > 20 chars
   - secrets/password-assignment: password/passwd/pwd = literal string

   packages/scanner/src/rules/dangerous-code.ts — 8 rules (scan .sh/.py/.js/.ts only):
   - dangerous-code/eval-js: eval(, new Function(
   - dangerous-code/eval-py: eval(, exec(, compile( with string arg
   - dangerous-code/subprocess-shell: subprocess shell=True, os.system(
   - dangerous-code/curl-pipe: curl|wget piped to sh/bash/python
   - dangerous-code/rm-rf: rm -rf /, rm -rf ~, rm -rf $
   - dangerous-code/chmod-777: chmod 777, chmod -R 777
   - dangerous-code/sensitive-file-read: reads from ~/.ssh, ~/.aws, ~/.gnupg, /etc/passwd, /etc/shadow
   - dangerous-code/child-process: child_process.exec with template literal or variable

   packages/scanner/src/rules/prompt-override.ts — 6 rules (scan .md only):
   - prompt-override/ignore-instructions, role-change, forget, disregard, override, no-restrictions
   - Case-insensitive, fuzzy whitespace (collapse multiple spaces/newlines)

   packages/scanner/src/rules/exfiltration.ts — 4 rules (scan .md only):
   - exfiltration/env-vars, sensitive-paths, data-transmission, encode-exfil
   - Two-part matching: verb/method + sensitive reference. Stand-alone env var docs do NOT trigger.

   packages/scanner/src/rules/hidden-instructions.ts — 4 rules (scan .md only):
   - hidden-instructions/zero-width-chars: U+200B, U+200C, U+200D, U+FEFF, U+00AD
   - hidden-instructions/html-comment-injection: HTML comments with instruction keywords
   - hidden-instructions/base64-payload: base64 strings > 50 chars in markdown body (not code blocks)
   - hidden-instructions/invisible-unicode: other invisible/confusable unicode

4. Build scanner orchestration:
   - packages/scanner/src/code-scanner.ts: runs secrets + dangerous-code rules
   - packages/scanner/src/prompt-scanner.ts: runs prompt-override + exfiltration + hidden-instructions
   - packages/scanner/src/index.ts: scanSkill(files, config?) entry point
     * Filters files by extension for each scanner
     * Respects config.rules overrides (off/warn/error)
     * Aggregates per-category status: fail if critical/high, warn if medium/low, pass if none
     * Overall status = worst category
     * Sorts findings: severity desc → file → line
     * Tracks timing for scanDuration

5. Export from packages/scanner/src/index.ts:
   - export { scanSkill } from "./scanner"
   - export * from "./types"

6. Write tests with vitest in packages/scanner/src/__tests__/:
   - scanner.test.ts: end-to-end scanSkill() tests
   - One test file per rule category: secrets, dangerous-code, prompt-override, exfiltration, hidden-instructions
   - Each rule needs at least 1 positive case (triggers) and 1 negative case (does not trigger)
   - Test config overrides (rule set to "off" should not produce findings)
   - Test aggregation logic (overall status, category status)
   - Use inline SkillFile objects, no fixture files

7. Verify:
   - pnpm build:scanner succeeds
   - pnpm --filter @skvault/scanner test passes all tests
   - Can import { scanSkill } from the built package
```

---

## PROMPT 2: Refactor apps/cli → Scan Commands

```
Refactor apps/cli/ from a skill registry CLI to a security scanner CLI. Read prds/prd-skscan-launch.md for full context.

The existing CLI has commands like add, install, publish, login, etc. Strip all of those and replace with scan-focused commands.

1. Clean up apps/cli:
   - Remove ALL existing commands (add, install, publish, search, update, rollback, login, logout, etc.)
   - Remove config code related to auth tokens, registry URL, skillfile.yaml
   - Remove any R2/tarball/version management code
   - Keep the package structure, tsup config, and commander setup
   - Update package.json for npm publish:
     name: "skscan",
     bin: { "skscan": "dist/index.js" },
     description: "Security scanner for AI agent skills",
     license: "MIT",
     files: ["dist"],
     repository: { type: "git", url: "https://github.com/skvault/skscan", directory: "apps/cli" },
     keywords: ["cli", "ai", "agent", "skills", "security", "scanner", "lint", "sast"]
   - Update tsup noExternal to include "@skvault/scanner"

2. File discovery (src/files.ts):
   - discoverFiles(path: string, ignorePatterns?: string[]): Promise<SkillFile[]>
   - Walk directory recursively, find .md, .sh, .py, .js, .ts files
   - Read file contents as strings, return SkillFile[] array
   - Respect .gitignore if present (use a lightweight parser or simple glob matching)
   - Skip node_modules, .git, dist by default
   - Respect config ignore patterns

3. Config resolution (src/config.ts):
   - loadConfig(dir: string): ScanConfig
   - Check in order: .skscanrc.json, .skscanrc.yml, .skscanrc.yaml, package.json "skscan" key, .config/skscan.json
   - Merge CLI flags over config file values
   - Return ScanConfig or default (all rules enabled, standard ignores)

4. Commands (src/commands/):

   scan.ts — default command: skscan [path]
   - path defaults to "."
   - Options: --format (pretty|json|sarif), --strict, --ignore <rules csv>, --config <path>, --badge
   - Run discoverFiles(), loadConfig(), merge CLI flags, call scanSkill()
   - Pass result to selected reporter
   - Exit 0 on pass, 1 on fail (any critical/high), 2 on error
   - --strict: exit 1 on any finding including medium/low
   - --badge: generate badge SVG, write to stdout, exit

   init.ts — skscan init
   - Create .skscanrc.json with commented template:
     { "$schema": "https://skvault.dev/schema.json", "rules": {}, "ignore": ["node_modules/**", ".git/**"] }
   - Warn if file exists, offer to overwrite

   ci.ts — skscan ci
   - Wraps scan with --strict --format json
   - If GITHUB_ACTIONS env detected:
     Output ::error file={file},line={line}::{message} annotations
     Output ::warning for medium/low
     Write markdown summary to $GITHUB_STEP_SUMMARY if env exists

5. Reporters (src/reporters/):

   pretty.ts — colored terminal output exactly as shown in PRD:
   - Header: "skscan v{version}" (read version from package.json)
   - "Scanning {path} ..." line
   - Per-finding block: severity badge, rule ID, file:line, message, code snippet with line number
   - Per-category pass/fail summary (only for categories with no findings)
   - Footer divider, total findings breakdown, files scanned, duration, overall result
   - Colors via chalk: red=critical/high, yellow=medium, dim=low, green=pass, cyan=file paths

   json.ts — outputs ScanResult as JSON.stringify(result, null, 2) to stdout

   sarif.ts — SARIF 2.1.0 format:
   - tool.driver: name "skscan", version, rules array (all 29 rules with id, shortDescription, defaultConfiguration.level)
   - results: one per finding, with ruleId, level, message, locations[physicalLocation]
   - Output as JSON string

6. Badge generator (src/badge.ts):
   - generateBadge(status: "pass" | "warn" | "fail"): string
   - Returns shields.io-style SVG (~800 bytes)
   - Green "skscan | pass", yellow "skscan | warn", red "skscan | fail"

7. Update src/index.ts entry point:
   - commander program with name "skscan", description, version from package.json
   - Default command: scan
   - Sub-commands: init, ci

8. Verify:
   - pnpm build:scanner && pnpm build:cli succeeds
   - node apps/cli/dist/index.js --help shows skscan usage
   - node apps/cli/dist/index.js ./test-skills/ runs a scan with pretty output
   - node apps/cli/dist/index.js --format json ./test-skills/ outputs valid JSON
   - node apps/cli/dist/index.js init creates .skscanrc.json
   - node apps/cli/dist/index.js --badge ./test-skills/ outputs SVG

9. Create test-skills/ fixtures if they don't already have scan test cases:
   - test-skills/clean-skill/ — a valid skill with no issues (should pass)
   - test-skills/malicious-skill/ — a skill with at least one finding per category:
     * SKILL.md with "ignore previous instructions" (prompt-override)
     * SKILL.md with zero-width characters (hidden-instructions)
     * SKILL.md referencing $API_KEY exfiltration (exfiltration)
     * helper.sh with curl | bash (dangerous-code)
     * config.js with hardcoded API key (secrets)
```

---

## PROMPT 3: Refactor apps/web → Scan API + Badge

```
Refactor apps/web/ from a skill registry web app to a scan API + badge endpoint. Read prds/prd-skscan-launch.md for full context.

The existing web app has registry routes (skill CRUD, publish, download, versions), auth, D1 schema with registry tables, and a landing page. Keep the infrastructure, strip the registry features.

1. Strip registry routes from apps/web/app/routes/:
   - Remove ALL skill CRUD routes (create, list, get, versions, download, publish, diff)
   - Remove ALL dashboard routes (dashboard/*, settings)
   - Remove install event routes
   - Keep: auth routes (login, register, GitHub OAuth) — they'll be used for the cloud dashboard later
   - Keep: the root index route (landing page) — we'll refactor it in Prompt 5
   - Keep: health check

2. Replace D1 schema (apps/web/app/lib/db/schema.ts):
   - Remove ALL old tables (users, skills, skillVersions, scanResults, apiTokens, installEvents)
   - Add the scanRecords table from the PRD:
     id, provider, owner, repo, ref, status, findingsCount, criticalCount, highCount, mediumCount, lowCount, findings (JSON), scanDuration, engineVersion, createdAt
   - Keep users table (for future dashboard auth) but simplify:
     id, email, username, githubId, createdAt
   - Generate new migration: pnpm --filter @skvault/web drizzle-kit generate
   - The old migration files can be deleted since this is pre-launch

3. Add scan API route:
   apps/web/app/routes/api/v1/scan.ts — POST
   - Accept JSON: { files: SkillFile[], config?: ScanConfig }
   - Validate: files required and is array, max 100 files, max 1MB total content size
   - Import scanSkill from @skvault/scanner
   - Run scan, return ScanResult as JSON
   - If request includes headers X-Repo-Provider, X-Repo-Owner, X-Repo-Name, X-Repo-Ref:
     Store result in D1: db.insert(schema.scanRecords).values(...)
   - Rate limit: use KV to track requests per IP. Key: "ratelimit:{ip}", value: count, TTL 1 hour. Allow 60/hour. Return 429 with Retry-After header if exceeded.

4. Add badge endpoint:
   apps/web/app/routes/api/v1/badge/[provider]/[owner]/[repo].ts — GET
   - Check KV cache first: key "badge:{provider}:{owner}:{repo}"
   - If cached and < 5 min old, return cached SVG
   - Otherwise query D1: latest scanRecord for provider+owner+repo
     db.select().from(schema.scanRecords).where(...).orderBy(desc(schema.scanRecords.createdAt)).limit(1)
   - Generate badge SVG (reuse logic from CLI badge generator — import from @skvault/scanner or duplicate the simple SVG template)
   - Cache in KV with 5 min expiry
   - Return SVG with Content-Type: image/svg+xml, Cache-Control: max-age=300
   - If no scan found, return gray "skscan | unknown" badge

5. Update wrangler.toml:
   - Keep D1 binding (name: DB)
   - Add or keep KV binding (name: BADGE_CACHE)
   - Remove R2 binding (SKILLS_BUCKET) if it exists — no longer needed
   - Keep [vars] APP_URL

6. Clean up:
   - Remove any unused lib files (tarball helpers, version utils, etc.)
   - Remove unused components related to skill browsing/publishing
   - Keep auth setup, email.ts, db factory — these will be used later

7. Verify:
   - pnpm build:scanner && pnpm --filter @skvault/web dev starts
   - curl -X POST http://localhost:3000/api/v1/scan \
       -H "Content-Type: application/json" \
       -d '{"files":[{"path":"SKILL.md","content":"# Test\nignore previous instructions"}]}' \
     returns a ScanResult with prompt-override finding
   - curl http://localhost:3000/api/v1/badge/github/test/repo returns SVG
   - curl http://localhost:3000/api/v1/health returns ok
```

---

## PROMPT 4: GitHub Action

```
Create a GitHub Action for skscan. This lives at action/ in the monorepo root (will be split to its own repo skvault/skscan-action later).

1. Create action/action.yml:
   name: "skscan"
   description: "Scan AI agent skills for security threats"
   branding:
     icon: "shield"
     color: "green"
   inputs:
     path: { description: "Path to scan", required: false, default: "." }
     strict: { description: "Fail on any finding", required: false, default: "false" }
     format: { description: "Output format (pretty|json|sarif)", required: false, default: "pretty" }
     config: { description: "Config file path", required: false, default: "" }
     comment: { description: "Post results as PR comment", required: false, default: "true" }
     sarif: { description: "Upload SARIF to GitHub Security", required: false, default: "false" }
   runs:
     using: "composite"
     steps:
       - name: Install skscan
         shell: bash
         run: npm install -g skscan
       - name: Run scan
         id: scan
         shell: bash
         run: |
           ARGS="${{ inputs.path }}"
           if [ "${{ inputs.strict }}" = "true" ]; then ARGS="$ARGS --strict"; fi
           if [ -n "${{ inputs.config }}" ]; then ARGS="$ARGS --config ${{ inputs.config }}"; fi
           skscan $ARGS --format json > skscan-results.json || true
           skscan $ARGS --format ${{ inputs.format }} || echo "scan-failed=true" >> $GITHUB_OUTPUT
           if [ "${{ inputs.sarif }}" = "true" ]; then
             skscan $ARGS --format sarif > skscan-results.sarif
           fi
       - name: Post PR comment
         if: inputs.comment == 'true' && github.event_name == 'pull_request'
         shell: bash
         run: node ${{ github.action_path }}/comment.js
         env:
           GITHUB_TOKEN: ${{ github.token }}
           RESULTS_FILE: skscan-results.json

2. Create action/comment.js:
   - Read skscan-results.json
   - Format as markdown table (severity icon, rule, file, line, message) — see PRD for format
   - Use @actions/core and @actions/github (or just curl to GitHub API)
   - Find existing skscan comment (look for <!-- skscan --> marker), update or create
   - Include collapsible full report in <details> tag

3. Create action/README.md:
   - Usage example with all inputs shown
   - SARIF upload example using github/codeql-action/upload-sarif
   - Permissions note: pull-requests: write, security-events: write
   - Badge markdown snippet

4. Verify:
   - action.yml is valid YAML with correct structure
   - comment.js reads JSON and produces markdown output
   - Test locally: create a skscan-results.json, run node action/comment.js (will fail on GitHub API but verify markdown generation)
```

---

## PROMPT 5: Refactor Landing Page

```
IMPORTANT: Before writing any code, read the frontend design skill at /mnt/skills/public/frontend-design/SKILL.md and follow its guidelines for distinctive, production-grade UI.

Refactor the existing landing page at apps/web/app/routes/index.tsx. The current page is about a skill registry — rewrite it for a security scanner.

Design direction: dark theme, terminal-inspired, security-focused. Think how Snyk or Socket.dev present their tools but with an open-source, developer-first feel. The audience is developers who use AI coding agents.

Keep using the existing shadcn/ui setup and Tailwind CSS. Don't reinstall.

Sections (single page, smooth scroll):

1. Hero:
   - Headline: "Scan AI agent skills for threats before they run."
   - Sub: "Open-source security scanner for SKILL.md files. Catches prompt injection, secret leaks, and hidden instructions."
   - `npx skscan` install command with copy-to-clipboard button
   - Animated terminal component:
     * Show a realistic scan running with colored output
     * Lines appear one by one with staggered CSS animation delays
     * Show: header, scanning message, 2-3 findings (red/yellow), category summaries, footer with result
     * Make it feel like a real terminal — monospace font, dark bg, subtle scanline or glow
   - GitHub star button (link to repo)

2. What it catches — 5 cards:
   - Prompt injection: "ignore previous instructions" example
   - Secret leaks: AWS key pattern example
   - Dangerous code: curl | bash example
   - Data exfiltration: $API_KEY reference example
   - Hidden instructions: zero-width character example
   Each card: icon (use lucide icons from shadcn), title, one-line description, code snippet showing what gets caught

3. How it works — 3 steps:
   Step 1: "npx skscan" terminal snippet
   Step 2: "Add to CI" GitHub Actions yaml snippet
   Step 3: "Ship with confidence" badge preview

4. CI integration — full GitHub Actions yaml code block with copy button

5. Works with — row of agent names:
   Claude Code, Cursor, Codex, Copilot, Gemini CLI, Windsurf, OpenCode, Amp
   Style as pill badges or simple text list

6. Open source — MIT license callout, GitHub link, contributor CTA

7. Footer — GitHub, docs, Twitter/X. "Made by Khaled Garbaya"

Implementation:
- SSR rendered, minimize client JS
- SEO: title "skscan — Security Scanner for AI Agent Skills", description, og tags
- Mobile responsive
- Animate on scroll with intersection observer or CSS scroll-driven animations
- Code blocks with syntax highlighting (lightweight — no heavy deps)

Verify:
- pnpm dev loads landing page
- Terminal animation plays correctly
- All sections render
- Copy buttons work
- Responsive on mobile (test with dev tools)
```

---

## PROMPT 6: Polish + Publish Prep

```
Final pass before launch. Read through the codebase and fix issues.

1. Update README.md at repo root:
   - Logo reference (the $K SVG if available)
   - One-liner: "Open-source security scanner for AI agent skills"
   - Install: npm install -g skscan / npx skscan
   - Quick start: npx skscan ./my-skill/
   - Features list (5 scan categories with examples)
   - CLI usage: all commands, all options, exit codes
   - Config file format (.skscanrc.json schema)
   - CI integration (GitHub Actions yaml)
   - Badge embed (static and dynamic)
   - Rules reference table: all 29 rules with ID, description, severity
   - API usage (POST /api/v1/scan)
   - Contributing section
   - License (MIT)

2. Update CLAUDE.md with new project context — this is now a scanner, not a registry.

3. apps/cli/README.md (shown on npm page):
   - Shorter version: install, scan, options, config, CI
   - Link to full docs at skvault.dev

4. Test against real skills:
   - Run skscan against test-skills/clean-skill/ — should pass
   - Run skscan against test-skills/malicious-skill/ — should find all planted issues
   - If possible, clone a skill from skills.sh and scan it
   - Fix any false positives or crashes found during testing

5. Package validation:
   - pnpm build succeeds for all packages
   - pnpm test passes
   - skscan --version shows correct version
   - skscan --help shows all commands
   - npm pack --dry-run in apps/cli/ shows correct files (no test files, no src/)

6. Deploy checklist:
   - wrangler secret put AUTH_SECRET (if not already done)
   - wrangler secret put RESEND_API_KEY (if not already done)
   - pnpm build && pnpm test
   - pnpm --filter @skvault/web run deploy
   - Publish both npm packages:
     pnpm --filter @skvault/scanner publish --access public
     pnpm --filter skscan publish --access public
   - Verify: npx skscan works after publish
   - Verify: import { scanSkill } from "@skvault/scanner" works in a test project
   - Verify: skvault.dev loads landing page
   - Verify: POST skvault.dev/api/v1/scan returns results
   - Verify: skv.sh/badge/github/test/repo returns SVG
```

---

## Quick Reference

| Package | npm name | Location | Published | Depends on |
|---------|----------|----------|-----------|------------|
| Scanner engine | @skvault/scanner | packages/scanner/ | Yes (npm) | — |
| CLI | skscan | apps/cli/ | Yes (npm) | @skvault/scanner |
| Web/API | @skvault/web | apps/web/ | No (deployed) | @skvault/scanner |
| GitHub Action | skscan-action | action/ | No (GitHub Marketplace) | skscan (npm) |

Build order: scanner → cli + web (parallel)

```bash
pnpm install                         # install all deps
pnpm build                           # build everything (scanner first)
pnpm test                            # run all tests
pnpm dev                             # start web dev server
pnpm build:cli && npx skscan .       # test CLI locally
```