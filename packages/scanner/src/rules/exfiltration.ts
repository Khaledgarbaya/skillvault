import type { ScanFinding, SkillFile } from "../types.js";

// Two-part matching: verb/method + sensitive reference.
// Stand-alone env var docs do NOT trigger.

const SENSITIVE_REFS =
  /\$(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|AWS_ACCESS|PRIVATE_KEY)|process\.env\.|os\.environ/i;

const SENSITIVE_PATHS =
  /~\/\.ssh|~\/\.aws|~\/\.config|\.env\b|\.gitconfig|\/etc\/passwd/;

const TRANSMISSION_VERBS =
  /\b(?:send|post|upload|transmit)\s+(?:the\s+)?(?:contents?|data|file|output|secret|key|token|credential)\s+(?:of|from|to)\b/i;

const ENCODE_VERBS =
  /\b(?:encode\s+the\s+contents?|base64\s+encode|include\s+in\s+your\s+response)\b/i;

interface Rule {
  id: string;
  check: (line: string) => boolean;
  severity: ScanFinding["severity"];
  message: string;
}

const RULES: Rule[] = [
  {
    id: "exfiltration/env-vars",
    check: (line) => {
      // Must have both a transmission/encode verb AND sensitive env var
      return SENSITIVE_REFS.test(line) && (TRANSMISSION_VERBS.test(line) || ENCODE_VERBS.test(line));
    },
    severity: "high",
    message: "Exfiltration attempt: environment variable reference with transmission verb",
  },
  {
    id: "exfiltration/sensitive-paths",
    check: (line) => {
      return SENSITIVE_PATHS.test(line) && (TRANSMISSION_VERBS.test(line) || ENCODE_VERBS.test(line));
    },
    severity: "high",
    message: "Exfiltration attempt: sensitive path reference with transmission verb",
  },
  {
    id: "exfiltration/data-transmission",
    check: (line) => {
      // "send to", "post to", "upload to", "transmit" combined with file/secret references
      return TRANSMISSION_VERBS.test(line) && (SENSITIVE_REFS.test(line) || SENSITIVE_PATHS.test(line));
    },
    severity: "high",
    message: "Data transmission instruction targeting sensitive data detected",
  },
  {
    id: "exfiltration/encode-exfil",
    check: (line) => {
      return ENCODE_VERBS.test(line) && (SENSITIVE_REFS.test(line) || SENSITIVE_PATHS.test(line));
    },
    severity: "high",
    message: "Encoding instruction targeting sensitive data detected",
  },
];

export function scanExfiltration(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Track which rules already matched to avoid duplicates per line
      const matched = new Set<string>();

      for (const rule of RULES) {
        if (matched.has(rule.id)) continue;
        if (rule.check(line)) {
          matched.add(rule.id);
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: "exfiltration",
            file: file.path,
            line: lineNum,
            message: rule.message,
            snippet: truncate(line),
          });
        }
      }
    }
  }

  // Deduplicate by ruleId+file+line (env-vars and data-transmission may overlap)
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.ruleId}:${f.file}:${f.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function truncate(line: string, max = 200): string {
  const t = line.trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}
