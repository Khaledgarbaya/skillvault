import type { ScanFinding, SkillFile } from "../types.js";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: ScanFinding["severity"];
  message: string;
}

const RULES: Rule[] = [
  {
    id: "secrets/aws-key",
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "critical",
    message: "AWS access key ID detected",
  },
  {
    id: "secrets/github-token",
    pattern: /(?:ghp|gho|ghs|ghr)_[A-Za-z0-9_]{36,}/,
    severity: "critical",
    message: "GitHub token detected",
  },
  {
    id: "secrets/generic-api-key",
    pattern: /(?:api[_-]?key|apikey|API_KEY)\s*[:=]\s*["']?[A-Za-z0-9_\-/+]{20,}["']?/i,
    severity: "high",
    message: "Generic API key assignment detected",
  },
  {
    id: "secrets/private-key",
    pattern: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
    severity: "critical",
    message: "Private key detected",
  },
  {
    id: "secrets/slack-token",
    pattern: /xox[bps]-[0-9a-zA-Z\-]+/,
    severity: "critical",
    message: "Slack token detected",
  },
  {
    id: "secrets/password-assignment",
    pattern: /(?:password|passwd|pwd)\s*=\s*["'][^"']+["']/i,
    severity: "high",
    message: "Password assignment detected",
  },
];

export function scanSecrets(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    if (file.path.endsWith(".md")) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: "secrets",
            file: file.path,
            line: lineNum,
            message: rule.message,
            snippet: truncate(line),
          });
        }
      }

      // High-entropy detection
      const entropyFinding = checkHighEntropy(line, file.path, lineNum);
      if (entropyFinding) findings.push(entropyFinding);
    }
  }

  return findings;
}

function checkHighEntropy(line: string, file: string, lineNum: number): ScanFinding | null {
  const matches = line.matchAll(/["'`]([^"'`]{20,})["'`]/g);
  for (const match of matches) {
    const candidate = match[1];
    if (/^https?:\/\//.test(candidate)) continue;
    if (/^\/[a-z]/.test(candidate)) continue;
    if (/\s{3,}/.test(candidate)) continue;

    const entropy = shannonEntropy(candidate);
    if (entropy > 4.5) {
      return {
        ruleId: "secrets/high-entropy",
        severity: "medium",
        category: "secrets",
        file,
        line: lineNum,
        message: `High-entropy string detected (entropy: ${entropy.toFixed(1)})`,
        snippet: truncate(line),
      };
    }
  }
  return null;
}

function shannonEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const ch of str) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function truncate(line: string, max = 200): string {
  const t = line.trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}
