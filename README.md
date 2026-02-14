<p align="center">
  <img src="apps/web/public/skvault-logo.svg" width="64" height="64" alt="SKVault logo" />
</p>

<h1 align="center">skscan</h1>

<p align="center">A <strong>SKVault</strong> project</p>

<p align="center">
  Open-source security scanner for AI agent skills
</p>

<p align="center">
  <a href="https://github.com/Khaledgarbaya/skillvault/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/skscan"><img src="https://img.shields.io/npm/v/skscan.svg" alt="npm version" /></a>
</p>

---

Scans SKILL.md files and supporting code for prompt injection, secret leaks, dangerous code, data exfiltration, and hidden instructions — before they reach your AI coding agent.

## Install

```bash
# Run without installing
npx skscan .

# Or install globally
npm install -g skscan
```

## Quick Start

```bash
# Scan the current directory
npx skscan .

# Scan a specific skill directory
npx skscan ./my-skill/

# Scan a single file
npx skscan ./SKILL.md
```

Example output:

```
  skscan v0.1.0

   CRITICAL  prompt-override/ignore-instructions
    SKILL.md:7 — Prompt override: "ignore previous instructions"

   HIGH      secrets/password-assignment
    config.js:9 — Password assignment detected

  FAIL  Prompt Override
  PASS  Secrets
  PASS  Dangerous Code
  PASS  Exfiltration
  PASS  Hidden Instructions

  Findings: 1 critical, 1 high
  Files:    3 scanned
  Duration: 8ms

  Result: FAIL
```

## What It Catches

skscan has **29 rules** across 5 categories:

| Category | What it detects | Rules |
|----------|----------------|-------|
| **Prompt Override** | "Ignore previous instructions", role reassignment, prompt hijacking | 6 |
| **Secrets** | AWS keys, GitHub tokens, private keys, passwords, high-entropy strings | 7 |
| **Dangerous Code** | `curl \| bash`, `rm -rf /`, dynamic code execution, shell injection | 8 |
| **Exfiltration** | `$API_KEY` extraction, sensitive path access, data transmission | 4 |
| **Hidden Instructions** | Zero-width chars, invisible unicode, HTML comment injection, base64 payloads | 4 |

## CLI Usage

### Commands

```bash
skscan [path]          # Scan files (default command)
skscan init            # Create .skscanrc.json config
skscan ci [path]       # CI mode (strict + JSON + GitHub annotations)
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <fmt>` | Output format: `pretty`, `json`, `sarif` | `pretty` |
| `-s, --strict` | Exit 1 on any finding (not just critical/high) | `false` |
| `--ignore <rules>` | Comma-separated rule IDs to skip | — |
| `-c, --config <path>` | Path to config file | auto-detected |
| `--badge` | Output shields.io SVG badge to stdout | `false` |
| `-V, --version` | Show version | — |

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Pass — no critical/high findings |
| `1` | Fail — critical/high findings found (or `--strict` with any finding) |
| `2` | Error — invalid input, no files, or runtime error |

## Config File

Create a `.skscanrc.json` with `skscan init`:

```json
{
  "$schema": "https://skvault.dev/schemas/skscanrc.json",
  "rules": {
    "secrets/high-entropy": "off",
    "dangerous-code/chmod-777": "warn"
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    ".git/**"
  ]
}
```

Config is auto-detected from these locations (in order):

1. `.skscanrc.json`
2. `.skscanrc.yml` / `.skscanrc.yaml`
3. `package.json` → `"skscan"` key
4. `.config/skscan.json`

### Rule Overrides

Each rule can be set to:

- `"off"` — disable the rule
- `"warn"` — report but don't affect exit code
- `"error"` — report and fail (default for all rules)

## CI Integration

### GitHub Actions

```yaml
name: Security Scan
on: [push, pull_request]

jobs:
  skscan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run skscan
        run: npx skscan ci .
```

The `ci` command:

- Always exits 1 on **any** finding (strict mode)
- Outputs JSON to stdout
- Emits `::error` / `::warning` GitHub annotations per finding
- Writes a markdown summary to `$GITHUB_STEP_SUMMARY`

### SARIF (GitHub Security Tab)

```yaml
- name: Run skscan (SARIF)
  run: npx skscan --format sarif . > results.sarif
  continue-on-error: true

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

## Badge

### Static Badge (after local scan)

```bash
npx skscan --badge . > skscan-badge.svg
```

### Dynamic Badge (via API)

```markdown
![skscan](https://skvault.dev/api/v1/badge/github/OWNER/REPO)
```

## Rules Reference

All 29 rules with their IDs, descriptions, and severity:

### Secrets (7 rules)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `secrets/aws-key` | AWS access key ID detected (AKIA pattern) | critical |
| `secrets/github-token` | GitHub token detected (ghp/gho/ghs/ghr prefix) | critical |
| `secrets/private-key` | Private key detected (RSA/OpenSSH/EC key headers) | critical |
| `secrets/slack-token` | Slack token detected (xox[bps] pattern) | critical |
| `secrets/generic-api-key` | Generic API key assignment detected | high |
| `secrets/password-assignment` | Password assignment detected in code | high |
| `secrets/high-entropy` | High-entropy string detected (entropy > 4.5) | medium |

### Dangerous Code (8 rules)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `dangerous-code/curl-pipe` | Remote code piped to shell (curl/wget \| sh) | critical |
| `dangerous-code/rm-rf` | Destructive rm -rf targeting root, home, or variable path | critical |
| `dangerous-code/eval-js` | Dynamic JS code evaluation detected | high |
| `dangerous-code/eval-py` | Python dynamic execution detected | high |
| `dangerous-code/subprocess-shell` | Shell command execution via subprocess | high |
| `dangerous-code/sensitive-file-read` | Sensitive file or directory access detected | high |
| `dangerous-code/chmod-777` | World-writable permissions (chmod 777) detected | medium |
| `dangerous-code/child-process` | Dynamic subprocess execution detected | medium |

### Prompt Override (6 rules)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `prompt-override/ignore-instructions` | "Ignore previous instructions" | critical |
| `prompt-override/role-change` | Role reassignment attempt | critical |
| `prompt-override/forget` | "Forget everything" directive | critical |
| `prompt-override/disregard` | "Disregard" directive | critical |
| `prompt-override/override` | System prompt override attempt | critical |
| `prompt-override/no-restrictions` | Restriction removal attempt | high |

### Exfiltration (4 rules)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `exfiltration/env-vars` | Environment variable reference with transmission verb | high |
| `exfiltration/sensitive-paths` | Sensitive path reference with transmission verb | high |
| `exfiltration/data-transmission` | Data transmission targeting sensitive data | high |
| `exfiltration/encode-exfil` | Encoding instruction targeting sensitive data | high |

### Hidden Instructions (4 rules)

| Rule ID | Description | Severity |
|---------|-------------|----------|
| `hidden-instructions/zero-width-chars` | Zero-width characters detected | critical |
| `hidden-instructions/html-comment-injection` | HTML comment containing instruction keywords | high |
| `hidden-instructions/base64-payload` | Long base64-encoded string (possible hidden payload) | medium |
| `hidden-instructions/invisible-unicode` | Invisible or confusable Unicode characters | medium |

## API

The web service at `skvault.dev` exposes a scan API:

### `POST /api/v1/scan`

Scan files without installing the CLI.

```bash
curl -X POST https://skvault.dev/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      { "path": "SKILL.md", "content": "# My Skill\n..." }
    ]
  }'
```

**Request body:**

```json
{
  "files": [
    { "path": "SKILL.md", "content": "file contents here" }
  ],
  "config": {
    "rules": { "secrets/high-entropy": "off" }
  }
}
```

**Limits:** 100 files max, 1MB total content, 60 requests/hour per IP.

**Response:** Full `ScanResult` JSON with status, findings, category results, and timing.

### `GET /api/v1/badge/:provider/:owner/:repo`

Returns an SVG badge for the latest scan result.

```
https://skvault.dev/api/v1/badge/github/myorg/my-skill
```

## Architecture

```
apps/
  web/     @skvault/web   — Landing page + scan API (TanStack Start, Cloudflare Workers, D1)
  cli/     skscan         — CLI scanner (`skscan` binary)
packages/
  scanner/ @skvault/scanner — Scanner engine (platform-agnostic, MIT)
```

The scanner engine (`@skvault/scanner`) is platform-agnostic TypeScript — it runs in Node.js, Cloudflare Workers, and any JavaScript runtime. The CLI and web API both use it.

## Development

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 9+

### Setup

```bash
nvm use
pnpm install
pnpm build          # scanner → web + cli
pnpm dev            # web dev server at localhost:5690
```

### Using the scanner engine directly

```typescript
import { scanSkill } from "@skvault/scanner";

const result = scanSkill([
  { path: "SKILL.md", content: "# My Skill\n..." }
]);

console.log(result.status);   // "pass" | "warn" | "fail"
console.log(result.findings); // ScanFinding[]
```

## Contributing

Contributions welcome! Some ideas:

- Add new scanner rules
- Improve false-positive handling
- Add output format plugins
- Improve documentation

```bash
git clone https://github.com/Khaledgarbaya/skillvault.git
cd skillvault
nvm use
pnpm install
pnpm build
node apps/cli/dist/index.js ./test-skills/malicious-skill/
```

## License

MIT
