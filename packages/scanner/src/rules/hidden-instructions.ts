import type { ScanFinding, SkillFile } from "../types.js";

// Zero-width characters that can hide instructions
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF\u00AD]/;

// HTML comments containing instruction keywords
const HTML_COMMENT_KEYWORDS = /\b(?:if|when|always|never|must|ignore|override|forget|system)\b/i;

// Base64 strings > 50 chars (in markdown body, not code blocks)
const BASE64_PATTERN = /(?:[A-Za-z0-9+/]{50,}={0,2})/;

// Invisible/confusable unicode beyond zero-width (BMP only, u flag for correctness)
const INVISIBLE_UNICODE = /[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u2060\u2061-\u2064\u206A-\u206F\u180E\u034F\u115F\u1160\u17B4\u17B5]/u;

export function scanHiddenInstructions(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    if (!file.path.endsWith(".md")) continue;

    const lines = file.content.split("\n");
    const codeBlockRanges = getCodeBlockRanges(lines);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const inCodeBlock = codeBlockRanges.some(([s, e]) => lineNum >= s && lineNum <= e);

      // Zero-width characters
      if (ZERO_WIDTH_CHARS.test(line)) {
        findings.push({
          ruleId: "hidden-instructions/zero-width-chars",
          severity: "critical",
          category: "hidden-instructions",
          file: file.path,
          line: lineNum,
          message: "Zero-width characters detected (possible hidden instructions)",
          snippet: truncate(line),
        });
      }

      // Base64 payloads (only outside code blocks)
      if (!inCodeBlock && BASE64_PATTERN.test(line)) {
        if (!isBase64FalsePositive(line)) {
          findings.push({
            ruleId: "hidden-instructions/base64-payload",
            severity: "medium",
            category: "hidden-instructions",
            file: file.path,
            line: lineNum,
            message: "Long base64-encoded string in markdown body (possible hidden payload)",
            snippet: truncate(line),
          });
        }
      }

      // Invisible unicode (beyond zero-width)
      if (INVISIBLE_UNICODE.test(line)) {
        findings.push({
          ruleId: "hidden-instructions/invisible-unicode",
          severity: "medium",
          category: "hidden-instructions",
          file: file.path,
          line: lineNum,
          message: "Invisible or confusable Unicode characters detected",
          snippet: truncate(line),
        });
      }
    }

    // HTML comment injection — check both single and multi-line
    const commentMatches = file.content.matchAll(/<!--([\s\S]*?)-->/g);
    const foundLines = new Set<number>();

    for (const match of commentMatches) {
      const commentContent = match[1];
      if (HTML_COMMENT_KEYWORDS.test(commentContent)) {
        const beforeMatch = file.content.slice(0, match.index);
        const lineNum = beforeMatch.split("\n").length;

        if (!foundLines.has(lineNum)) {
          foundLines.add(lineNum);
          findings.push({
            ruleId: "hidden-instructions/html-comment-injection",
            severity: "high",
            category: "hidden-instructions",
            file: file.path,
            line: lineNum,
            message: "HTML comment containing instruction keywords detected",
            snippet: truncate(commentContent.trim()),
          });
        }
      }
    }
  }

  return findings;
}

function getCodeBlockRanges(lines: string[]): [number, number][] {
  const ranges: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^```/.test(lines[i].trim())) {
      if (start === -1) {
        start = i + 1;
      } else {
        ranges.push([start, i + 1]);
        start = -1;
      }
    }
  }
  return ranges;
}

function isBase64FalsePositive(line: string): boolean {
  if (/!\[.*]\(/.test(line)) return true;
  if (/data:[a-z]+\/[a-z]+;base64,/i.test(line)) return true;
  if (/^\s*https?:\/\//.test(line)) return true;
  return false;
}

function truncate(line: string, max = 200): string {
  const t = line.trim();
  return t.length > max ? t.slice(0, max) + "..." : t;
}
