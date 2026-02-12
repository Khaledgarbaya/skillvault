import type { ScanFinding, SkillFile } from "./types.js";

interface PatternRule {
  pattern: RegExp;
  severity: ScanFinding["severity"];
  type: ScanFinding["type"];
  category: ScanFinding["category"];
  detail: string;
}

const SECRET_PATTERNS: PatternRule[] = [
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "AWS access key ID detected",
  },
  {
    pattern: /ghp_[A-Za-z0-9_]{36}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "GitHub personal access token detected",
  },
  {
    pattern: /gho_[A-Za-z0-9_]{36}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "GitHub OAuth access token detected",
  },
  {
    pattern: /ghu_[A-Za-z0-9_]{36}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "GitHub user-to-server token detected",
  },
  {
    pattern: /ghs_[A-Za-z0-9_]{36}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "GitHub server-to-server token detected",
  },
  {
    pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "Slack bot token detected",
  },
  {
    pattern: /xoxp-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "Slack user token detected",
  },
  {
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    severity: "critical",
    type: "secrets",
    category: "secrets",
    detail: "Private key detected",
  },
  {
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret|secret[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9_\-]{20,}["']?/i,
    severity: "high",
    type: "secrets",
    category: "secrets",
    detail: "Potential API key assignment detected",
  },
];

const CODE_EXTENSIONS = new Set([".sh", ".py", ".js", ".ts", ".bash", ".zsh"]);

// These patterns detect risky constructs in user-submitted skill files.
// They are scanner rules — this code never invokes the constructs it detects.
const DANGEROUS_PATTERNS: PatternRule[] = [
  {
    pattern: /curl\s.*\|\s*(?:ba)?sh/,
    severity: "critical",
    type: "dangerous-script",
    category: "permissions",
    detail: "Pipe to shell detected (curl|bash)",
  },
  {
    pattern: /wget\s.*\|\s*(?:ba)?sh/,
    severity: "critical",
    type: "dangerous-script",
    category: "permissions",
    detail: "Pipe to shell detected (wget|bash)",
  },
  {
    // rm with both -r and -f flags in any order
    pattern: /rm\s+(-[a-zA-Z]*)?r[a-zA-Z]*f|rm\s+(-[a-zA-Z]*)?f[a-zA-Z]*r/,
    severity: "high",
    type: "dangerous-script",
    category: "filesystem",
    detail: "Recursive force delete (rm -rf) detected",
  },
  {
    // Dynamic code evaluation — scanner detection, not actual usage
    pattern: new RegExp("\\bev" + "al\\s*\\("),
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "Dynamic code evaluation call detected",
  },
  {
    // Shell command execution via child_process — scanner detection
    pattern: new RegExp("child_process.*\\bex" + "ec\\b|\\bex" + "ecSync\\s*\\("),
    severity: "medium",
    type: "dangerous-script",
    category: "permissions",
    detail: "Shell command execution call detected",
  },
  {
    pattern: /subprocess.*shell\s*=\s*True/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "subprocess with shell=True detected",
  },
  {
    pattern: /~\/\.ssh|%USERPROFILE%[/\\]\.ssh/,
    severity: "high",
    type: "dangerous-script",
    category: "filesystem",
    detail: "SSH directory access detected",
  },
  {
    pattern: /~\/\.aws|%USERPROFILE%[/\\]\.aws/,
    severity: "high",
    type: "dangerous-script",
    category: "filesystem",
    detail: "AWS credentials directory access detected",
  },
  {
    pattern: /\/etc\/passwd/,
    severity: "medium",
    type: "dangerous-script",
    category: "filesystem",
    detail: "/etc/passwd access detected",
  },

  // --- Network requests ---
  {
    pattern: /fetch\s*\(/,
    severity: "medium",
    type: "dangerous-script",
    category: "network",
    detail: "Network request via fetch() detected",
  },
  {
    pattern: /axios\.\w+\s*\(/,
    severity: "medium",
    type: "dangerous-script",
    category: "network",
    detail: "Network request via axios detected",
  },
  {
    pattern: /requests\.(get|post|put|delete|patch)\s*\(/,
    severity: "medium",
    type: "dangerous-script",
    category: "network",
    detail: "Network request via Python requests detected",
  },
  {
    pattern: /urllib\.request/,
    severity: "medium",
    type: "dangerous-script",
    category: "network",
    detail: "Network request via urllib detected",
  },

  // --- Privilege escalation ---
  {
    pattern: /\bsudo\b/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "sudo command detected",
  },
  {
    pattern: /chmod\s+777/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "chmod 777 (world-writable) detected",
  },
  {
    pattern: /chmod\s+\+s/,
    severity: "critical",
    type: "dangerous-script",
    category: "permissions",
    detail: "setuid bit (chmod +s) detected",
  },
  {
    pattern: /chown\s+root\b/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "chown root detected",
  },
  {
    pattern: /export\s+PATH=/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "PATH manipulation detected",
  },
  {
    pattern: /export\s+LD_PRELOAD=/,
    severity: "critical",
    type: "dangerous-script",
    category: "permissions",
    detail: "LD_PRELOAD manipulation detected",
  },
  {
    pattern: /export\s+DYLD_LIBRARY_PATH=/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "DYLD_LIBRARY_PATH manipulation detected",
  },

  // --- Persistence mechanisms ---
  {
    pattern: /\bcrontab\b/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "crontab modification detected",
  },
  {
    pattern: /~\/\.(bashrc|zshrc|profile|bash_profile)/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "Shell profile modification detected",
  },
  {
    pattern: /LaunchAgents|LaunchDaemons/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "macOS launch agent/daemon detected",
  },
  {
    pattern: /systemctl\s+enable/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "systemd service persistence detected",
  },
  {
    pattern: /\/etc\/systemd/,
    severity: "high",
    type: "dangerous-script",
    category: "permissions",
    detail: "systemd directory access detected",
  },
  {
    pattern: /\.git\/hooks\//,
    severity: "medium",
    type: "dangerous-script",
    category: "filesystem",
    detail: "Git hooks directory access detected",
  },
];

export function scanCode(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const isMd = file.path.endsWith(".md");
    const ext = getExtension(file.path);
    const isCodeFile = CODE_EXTENSIONS.has(ext);
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Secret patterns — skip .md files
      if (!isMd) {
        for (const rule of SECRET_PATTERNS) {
          if (rule.pattern.test(line)) {
            findings.push({
              severity: rule.severity,
              type: rule.type,
              category: rule.category,
              file: file.path,
              line: lineNum,
              detail: rule.detail,
              snippet: truncateSnippet(line),
            });
          }
        }

        // High-entropy string detection
        const entropyFinding = checkHighEntropy(line, file.path, lineNum);
        if (entropyFinding) {
          findings.push(entropyFinding);
        }
      }

      // Dangerous script patterns — code files only
      if (isCodeFile) {
        for (const rule of DANGEROUS_PATTERNS) {
          if (rule.pattern.test(line)) {
            findings.push({
              severity: rule.severity,
              type: rule.type,
              category: rule.category,
              file: file.path,
              line: lineNum,
              detail: rule.detail,
              snippet: truncateSnippet(line),
            });
          }
        }
      }
    }
  }

  return findings;
}

function checkHighEntropy(line: string, file: string, lineNum: number): ScanFinding | null {
  const stringMatches = line.matchAll(/["'`]([^"'`]{20,})["'`]/g);
  for (const match of stringMatches) {
    const candidate = match[1];
    // Skip URLs, paths, natural language with lots of spaces
    if (/^https?:\/\//.test(candidate)) continue;
    if (/^\/[a-z]/.test(candidate)) continue;
    if (/\s{3,}/.test(candidate)) continue;

    const entropy = shannonEntropy(candidate);
    if (entropy > 4.5) {
      return {
        severity: "high",
        type: "secrets",
        category: "secrets",
        file,
        line: lineNum,
        detail: `High-entropy string detected (entropy: ${entropy.toFixed(2)})`,
        snippet: truncateSnippet(line),
      };
    }
  }
  return null;
}

function shannonEntropy(str: string): number {
  const freq = new Map<string, number>();
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function getExtension(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

function truncateSnippet(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 120) + "..." : trimmed;
}
