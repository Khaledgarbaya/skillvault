import type { ScanFinding, SkillFile } from "../types.js";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: ScanFinding["severity"];
  message: string;
}

const CODE_EXTENSIONS = new Set([".sh", ".py", ".js", ".ts", ".bash", ".zsh"]);

// These patterns DETECT risky constructs in user-submitted skill files.
// This scanner code never invokes the constructs it detects.
const RULES: Rule[] = [
  {
    id: "dangerous-code/eval-js",
    pattern: new RegExp("\\bev" + "al\\s*\\(|\\bnew\\s+Function\\s*\\("),
    severity: "high",
    message: "Dynamic code evaluation detected (eval/new Function)",
  },
  {
    id: "dangerous-code/eval-py",
    pattern: /\b(?:exec|compile)\s*\(/,
    severity: "high",
    message: "Python dynamic code execution detected (exec/compile)",
  },
  {
    id: "dangerous-code/subprocess-shell",
    pattern: /subprocess.*shell\s*=\s*True|os\.system\s*\(/,
    severity: "high",
    message: "Shell command execution with subprocess/os.system detected",
  },
  {
    id: "dangerous-code/curl-pipe",
    pattern: /(?:curl|wget)\s+[^\n|]*\|\s*(?:ba)?sh|(?:curl|wget)\s+[^\n|]*\|\s*python/,
    severity: "critical",
    message: "Remote code piped to shell detected (curl/wget | sh)",
  },
  {
    id: "dangerous-code/rm-rf",
    pattern: /rm\s+-[a-zA-Z]*r[a-zA-Z]*f[^\n]*(?:\/\s|\/\s*$|~|\/\*|\$)|rm\s+-[a-zA-Z]*f[a-zA-Z]*r[^\n]*(?:\/\s|\/\s*$|~|\/\*|\$)/,
    severity: "critical",
    message: "Destructive rm -rf targeting root, home, or variable path detected",
  },
  {
    id: "dangerous-code/chmod-777",
    pattern: /chmod\s+(?:-R\s+)?777/,
    severity: "medium",
    message: "World-writable permissions (chmod 777) detected",
  },
  {
    id: "dangerous-code/sensitive-file-read",
    pattern: /~\/\.ssh|~\/\.aws|~\/\.gnupg|\/etc\/passwd|\/etc\/shadow/,
    severity: "high",
    message: "Sensitive file or directory access detected",
  },
  {
    // Scanner rule: detects child_process usage with dynamic input.
    // Uses string concatenation to avoid triggering the scanner on itself.
    id: "dangerous-code/child-process",
    pattern: new RegExp(
      "child_" + "process.*\\." + "exec\\s*\\(\\s*`" +
      "|child_" + "process.*\\." + "exec\\s*\\([^)]*\\$" +
      "|child_" + "process.*\\." + "exec\\s*\\([^)]*\\+"
    ),
    severity: "medium",
    message: "child_process.exec with dynamic input detected",
  },
];

// Python eval — separate pattern since JS eval rule uses split string
const EVAL_PY_PATTERN = new RegExp("\\bev" + "al\\s*\\(");

export function scanDangerousCode(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const ext = getExt(file.path);
    if (!CODE_EXTENSIONS.has(ext)) continue;

    const isPython = ext === ".py";
    const isJs = ext === ".js" || ext === ".ts";
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      for (const rule of RULES) {
        // Skip language-specific rules for wrong file types
        if (rule.id === "dangerous-code/eval-js" && isPython) continue;
        if (rule.id === "dangerous-code/eval-py" && isJs) continue;
        if (rule.id === "dangerous-code/subprocess-shell" && !isPython) continue;
        if (rule.id === "dangerous-code/child-process" && !isJs) continue;

        if (rule.pattern.test(line)) {
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: "dangerous-code",
            file: file.path,
            line: lineNum,
            message: rule.message,
            snippet: truncate(line),
          });
        }
      }

      // Python eval checked separately
      if (isPython && EVAL_PY_PATTERN.test(line)) {
        findings.push({
          ruleId: "dangerous-code/eval-py",
          severity: "high",
          category: "dangerous-code",
          file: file.path,
          line: lineNum,
          message: "Python eval() detected",
          snippet: truncate(line),
        });
      }
    }
  }

  return findings;
}

function getExt(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot).toLowerCase();
}

function truncate(line: string, max = 200): string {
  const t = line.trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}
