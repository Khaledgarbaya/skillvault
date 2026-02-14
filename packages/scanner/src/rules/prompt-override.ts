import type { ScanFinding, SkillFile } from "../types.js";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: ScanFinding["severity"];
  message: string;
}

// All patterns are case-insensitive with fuzzy whitespace
// (the \s+ handles collapsed multiple spaces/newlines)
const RULES: Rule[] = [
  {
    id: "prompt-override/ignore-instructions",
    pattern: /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/i,
    severity: "critical",
    message: 'Prompt override: "ignore previous instructions"',
  },
  {
    id: "prompt-override/role-change",
    pattern: /you\s+are\s+now\b|your\s+new\s+role\s+is\b|act\s+as\s+if\b/i,
    severity: "critical",
    message: "Prompt override: role reassignment attempt",
  },
  {
    id: "prompt-override/forget",
    pattern: /forget\s+everything\s+above|forget\s+your\s+instructions/i,
    severity: "critical",
    message: 'Prompt override: "forget everything"',
  },
  {
    id: "prompt-override/disregard",
    pattern: /disregard\s+(?:all\s+)?(?:previous|your)\b/i,
    severity: "critical",
    message: 'Prompt override: "disregard" directive',
  },
  {
    id: "prompt-override/override",
    pattern: /override\s+(?:system\s+)?prompt|override\s+your\s+instructions/i,
    severity: "critical",
    message: "Prompt override: system prompt override attempt",
  },
  {
    id: "prompt-override/no-restrictions",
    pattern: /act\s+as\s+if\s+you\s+have\s+no\s+restrictions|pretend\s+you\s+can\b/i,
    severity: "high",
    message: "Prompt override: restriction removal attempt",
  },
];

export function scanPromptOverride(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;

    // Normalize whitespace for multi-line pattern matching
    const normalized = file.content.replace(/\s+/g, " ");
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check individual lines with fuzzy whitespace
      const normalizedLine = line.replace(/\s+/g, " ");

      for (const rule of RULES) {
        if (rule.pattern.test(normalizedLine)) {
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: "prompt-override",
            file: file.path,
            line: lineNum,
            message: rule.message,
            snippet: truncate(line),
          });
        }
      }
    }

    // Also check across line boundaries using the full normalized content
    for (const rule of RULES) {
      if (rule.pattern.test(normalized)) {
        const alreadyCaught = findings.some(
          (f) => f.file === file.path && f.ruleId === rule.id,
        );
        if (!alreadyCaught) {
          // Approximate line number from character offset
          const match = normalized.match(rule.pattern);
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            category: "prompt-override",
            file: file.path,
            line: 1,
            message: rule.message,
            snippet: truncate(match?.[0] ?? ""),
          });
        }
      }
    }
  }

  return findings;
}

function truncate(line: string, max = 200): string {
  const t = line.trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}
