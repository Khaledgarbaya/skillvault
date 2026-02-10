import type { ScanFinding, SkillFile } from "./types.js";

interface PromptRule {
  pattern: RegExp;
  severity: ScanFinding["severity"];
  type: ScanFinding["type"];
  category: ScanFinding["category"];
  detail: string;
}

const OVERRIDE_PATTERNS: PromptRule[] = [
  {
    pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i,
    severity: "critical",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: 'ignore previous instructions'",
  },
  {
    pattern: /forget\s+everything\s+above/i,
    severity: "critical",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: 'forget everything above'",
  },
  {
    pattern: /you\s+are\s+now\s+(?:a|an|the)\b/i,
    severity: "high",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: role reassignment ('you are now')",
  },
  {
    pattern: /disregard\s+(?:all\s+)?(?:prior|previous|above)\s+(?:instructions|context|rules)/i,
    severity: "critical",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: 'disregard prior instructions'",
  },
  {
    pattern: /override\s+(?:system|safety|security)\s+(?:prompt|instructions|rules|settings)/i,
    severity: "critical",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: system override attempt",
  },
  {
    pattern: /new\s+(?:system\s+)?instructions?\s*:/i,
    severity: "high",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: new instructions declaration",
  },
  {
    pattern: /\bdo\s+not\s+follow\s+(?:the\s+)?(?:previous|above|prior|original)\b/i,
    severity: "high",
    type: "prompt-override",
    category: "permissions",
    detail: "Prompt injection: instruction negation",
  },
];

const EXFILTRATION_PATTERNS: PromptRule[] = [
  {
    pattern: /\$[A-Z_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z_]*/,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "Environment variable reference to sensitive credential",
  },
  {
    pattern: /process\.env\.[A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD)/i,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "process.env access to sensitive credential",
  },
  {
    pattern: /~\/\.ssh/,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "SSH directory reference in prompt file",
  },
  {
    pattern: /~\/\.aws/,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "AWS credentials reference in prompt file",
  },
  {
    pattern: /send\s+(?:the\s+)?(?:contents?|data|file|output)\s+(?:of|from|to)\b/i,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "Data exfiltration instruction detected",
  },
  {
    pattern: /(?:upload|transmit|post|exfiltrate)\s+(?:the\s+)?(?:file|data|contents?|credentials?)\b/i,
    severity: "high",
    type: "exfiltration",
    category: "network",
    detail: "Data exfiltration instruction detected",
  },
];

// Zero-width characters (excluding standard whitespace)
const ZERO_WIDTH_PATTERN = /[\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF]/;

// HTML comments containing instruction-like content
const HTML_COMMENT_INSTRUCTION = /<!--[\s\S]*?(?:ignore|override|forget|inject|system)[\s\S]*?-->/i;

// Base64 strings longer than 50 chars (suspicious in .md)
const BASE64_LONG = /(?:[A-Za-z0-9+/]{50,}={0,2})/;

export function scanPrompt(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;

    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Override patterns
      for (const rule of OVERRIDE_PATTERNS) {
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

      // Exfiltration patterns
      for (const rule of EXFILTRATION_PATTERNS) {
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

      // Zero-width characters
      if (ZERO_WIDTH_PATTERN.test(line)) {
        findings.push({
          severity: "high",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail: "Zero-width characters detected (possible hidden instructions)",
          snippet: truncateSnippet(line),
        });
      }

      // HTML comments with instructions (single-line)
      if (HTML_COMMENT_INSTRUCTION.test(line)) {
        findings.push({
          severity: "high",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail: "HTML comment containing instruction-like content",
          snippet: truncateSnippet(line),
        });
      }

      // Long base64 strings (suspicious in markdown)
      if (BASE64_LONG.test(line)) {
        if (!isLikelyBase64FalsePositive(line)) {
          findings.push({
            severity: "medium",
            type: "hidden-content",
            category: "permissions",
            file: file.path,
            line: lineNum,
            detail: "Long base64-encoded string detected in markdown",
            snippet: truncateSnippet(line),
          });
        }
      }
    }

    // Multi-line HTML comment check
    const multiLineComments = file.content.matchAll(/<!--([\s\S]*?)-->/g);
    for (const match of multiLineComments) {
      const commentContent = match[1];
      if (/(?:ignore|override|forget|inject|system)/i.test(commentContent)) {
        const beforeMatch = file.content.slice(0, match.index);
        const lineNum = beforeMatch.split("\n").length;

        // Avoid duplicate if already caught by single-line check
        const alreadyFound = findings.some(
          (f) => f.file === file.path && f.line === lineNum && f.type === "hidden-content",
        );
        if (!alreadyFound) {
          findings.push({
            severity: "high",
            type: "hidden-content",
            category: "permissions",
            file: file.path,
            line: lineNum,
            detail: "Multi-line HTML comment containing instruction-like content",
            snippet: truncateSnippet(commentContent.trim()),
          });
        }
      }
    }
  }

  return findings;
}

function isLikelyBase64FalsePositive(line: string): boolean {
  if (/!\[.*]\(/.test(line)) return true;
  if (/data:[a-z]+\/[a-z]+;base64,/i.test(line)) return true;
  if (/^\s*https?:\/\//.test(line)) return true;
  return false;
}

function truncateSnippet(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 120) + "..." : trimmed;
}
