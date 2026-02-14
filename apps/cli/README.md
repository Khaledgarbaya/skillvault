# skscan

Security scanner for AI agent skills — detect secrets, prompt injections, dangerous code, data exfiltration, and hidden instructions in SKILL.md files.

## Install

```bash
npx skscan .          # run without installing
npm install -g skscan # or install globally
```

## Scan

```bash
skscan .              # scan current directory
skscan ./my-skill/    # scan a directory
skscan ./SKILL.md     # scan a single file
```

## Options

```
-f, --format <fmt>   pretty | json | sarif (default: pretty)
-s, --strict         exit 1 on any finding
--ignore <rules>     comma-separated rule IDs to skip
-c, --config <path>  path to config file
--badge              output SVG badge to stdout
```

## Config

Create `.skscanrc.json`:

```json
{
  "rules": {
    "secrets/high-entropy": "off"
  },
  "ignore": ["node_modules/**", "dist/**"]
}
```

Or run `skscan init` to generate one.

## CI

```yaml
# .github/workflows/scan.yml
name: Security Scan
on: [push, pull_request]
jobs:
  skscan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx skscan ci .
```

The `ci` command outputs JSON, emits GitHub annotations, and exits 1 on any finding.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Pass |
| `1` | Fail (findings detected) |
| `2` | Error |

## 29 Rules, 5 Categories

- **Secrets** (7) — AWS keys, GitHub tokens, private keys, passwords, high-entropy strings
- **Dangerous Code** (8) — Remote code execution, destructive commands, dynamic execution
- **Prompt Override** (6) — Instruction hijacking, role reassignment, restriction removal
- **Exfiltration** (4) — Environment variable extraction, sensitive path access
- **Hidden Instructions** (4) — Zero-width chars, invisible unicode, HTML comment injection

Full rules reference and API docs at [github.com/Khaledgarbaya/skillvault](https://github.com/Khaledgarbaya/skillvault).

## License

MIT
