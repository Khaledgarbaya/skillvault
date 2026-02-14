import type {
  FindingCategory,
  FindingSeverity,
  ScanConfig,
  ScanFinding,
  ScanResult,
  ScanStatus,
  SkillFile,
} from "./types.js";
import { scanCode } from "./code-scanner.js";
import { scanPrompt } from "./prompt-scanner.js";

const ENGINE_VERSION = "0.1.0";

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function scanSkill(files: SkillFile[], config?: ScanConfig): ScanResult {
  const start = Date.now();

  // Filter ignored files
  const filteredFiles = config?.ignore
    ? files.filter((f) => !matchesAnyGlob(f.path, config.ignore!))
    : files;

  // Run all scanners
  let findings: ScanFinding[] = [
    ...scanCode(filteredFiles),
    ...scanPrompt(filteredFiles),
  ];

  // Apply config rule overrides
  if (config?.rules) {
    findings = findings.filter((f) => {
      const override = config.rules![f.ruleId];
      if (override === "off") return false;
      if (override === "warn") {
        f.severity = "medium";
      }
      return true;
    });
  }

  // Sort: severity desc → file → line
  findings.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    return a.line - b.line;
  });

  // Compute summary
  const summary = { total: findings.length, critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) summary[f.severity]++;

  // Compute per-category status
  const categoryMap: Record<FindingCategory, ScanFinding[]> = {
    secrets: [],
    "dangerous-code": [],
    "prompt-override": [],
    exfiltration: [],
    "hidden-instructions": [],
  };
  for (const f of findings) categoryMap[f.category].push(f);

  const categories = {
    secrets: categoryStatus(categoryMap["secrets"]),
    dangerousCode: categoryStatus(categoryMap["dangerous-code"]),
    promptOverride: categoryStatus(categoryMap["prompt-override"]),
    exfiltration: categoryStatus(categoryMap["exfiltration"]),
    hiddenInstructions: categoryStatus(categoryMap["hidden-instructions"]),
  };

  const status = worstStatus(Object.values(categories));
  const scanDuration = Date.now() - start;

  return {
    status,
    summary,
    findings,
    categories,
    scannedFiles: filteredFiles.length,
    scanDuration,
    engineVersion: ENGINE_VERSION,
  };
}

export function categoryStatus(findings: ScanFinding[]): ScanStatus {
  if (findings.length === 0) return "pass";
  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "high") return "fail";
  }
  return "warn";
}

export function worstStatus(statuses: ScanStatus[]): ScanStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

function matchesAnyGlob(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (simpleGlobMatch(path, pattern)) return true;
  }
  return false;
}

function simpleGlobMatch(path: string, pattern: string): boolean {
  // Simple glob: ** matches any path segment, * matches within segment
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${regexStr}$`).test(path);
}
