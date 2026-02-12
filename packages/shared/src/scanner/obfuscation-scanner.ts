import type { ScanFinding, SkillFile } from "./types.js";

const CODE_EXTENSIONS = new Set([".sh", ".py", ".js", ".ts", ".bash", ".zsh"]);

const LONG_HEX_PATTERN = /(?:\\x[0-9a-fA-F]{2}){10,}/;
const HEX_ESCAPE_PATTERN = /\\x[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}/g;
const CHAR_CONCAT_PATTERN =
  /'.'\s*\+\s*'.'\s*\+\s*'.'\s*\+\s*'.'/;

export function scanObfuscation(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const ext =
      file.path.lastIndexOf(".") === -1
        ? ""
        : file.path.slice(file.path.lastIndexOf(".")).toLowerCase();
    if (!CODE_EXTENSIONS.has(ext)) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Long hex strings: 10+ consecutive \xNN sequences
      if (LONG_HEX_PATTERN.test(line)) {
        findings.push({
          severity: "high",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail: "Long hex-encoded string detected",
          snippet: truncateSnippet(line),
        });
      }
      // Hex escape density: >30% of line characters are hex escapes (min 20 chars)
      else if (line.length >= 20) {
        const matches = line.match(HEX_ESCAPE_PATTERN);
        if (matches) {
          const escapeChars = matches.reduce((sum, m) => sum + m.length, 0);
          if (escapeChars / line.length > 0.3) {
            findings.push({
              severity: "high",
              type: "hidden-content",
              category: "permissions",
              file: file.path,
              line: lineNum,
              detail:
                "High density of hex escape sequences detected (possible obfuscation)",
              snippet: truncateSnippet(line),
            });
          }
        }
      }

      // Char-by-char concatenation: 4+ single-char concat joins
      if (CHAR_CONCAT_PATTERN.test(line)) {
        findings.push({
          severity: "high",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail:
            "Character-by-character string concatenation detected (possible obfuscation)",
          snippet: truncateSnippet(line),
        });
      }
    }
  }

  return findings;
}

function truncateSnippet(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 120) + "..." : trimmed;
}
