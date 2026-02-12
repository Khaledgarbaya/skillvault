export type {
  ScanStatus,
  ScanFinding,
  ScanOutput,
  ScanReport,
  SkillFile,
  FindingSeverity,
  FindingType,
  FindingCategory,
} from "./types.js";

export { scanCode } from "./code-scanner.js";
export { scanPrompt } from "./prompt-scanner.js";
export { scanObfuscation } from "./obfuscation-scanner.js";
export { scanHomoglyphs } from "./homoglyph-scanner.js";

import type { ScanFinding, ScanOutput, ScanStatus, SkillFile, FindingCategory } from "./types.js";
import { scanCode } from "./code-scanner.js";
import { scanPrompt } from "./prompt-scanner.js";
import { scanObfuscation } from "./obfuscation-scanner.js";
import { scanHomoglyphs } from "./homoglyph-scanner.js";

const CATEGORIES: FindingCategory[] = ["secrets", "permissions", "network", "filesystem"];

export function scanSkill(files: SkillFile[]): ScanOutput {
  const codeFindings = scanCode(files);
  const promptFindings = scanPrompt(files);
  const obfuscationFindings = scanObfuscation(files);
  const homoglyphFindings = scanHomoglyphs(files);
  const allFindings = [...codeFindings, ...promptFindings, ...obfuscationFindings, ...homoglyphFindings];

  // Group findings by category
  const grouped = new Map<FindingCategory, ScanFinding[]>();
  for (const cat of CATEGORIES) {
    grouped.set(cat, []);
  }
  for (const f of allFindings) {
    grouped.get(f.category)!.push(f);
  }

  // Compute per-category status
  const secretsFindings = grouped.get("secrets")!;
  const permissionsFindings = grouped.get("permissions")!;
  const networkFindings = grouped.get("network")!;
  const filesystemFindings = grouped.get("filesystem")!;

  const secretsStatus = categoryStatus(secretsFindings);
  const permissionsStatus = categoryStatus(permissionsFindings);
  const networkStatus = categoryStatus(networkFindings);
  const filesystemStatus = categoryStatus(filesystemFindings);

  // Overall = worst across all categories
  const overallStatus = worstStatus([secretsStatus, permissionsStatus, networkStatus, filesystemStatus]);

  return {
    status: overallStatus,
    findings: allFindings,
    secretsStatus,
    secretsFindings,
    permissionsStatus,
    permissionsFindings,
    networkStatus,
    networkFindings,
    filesystemStatus,
    filesystemFindings,
    overallStatus,
  };
}

function categoryStatus(findings: ScanFinding[]): ScanStatus {
  if (findings.length === 0) return "pass";

  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "high") {
      return "fail";
    }
  }
  return "warn";
}

function worstStatus(statuses: ScanStatus[]): ScanStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}
