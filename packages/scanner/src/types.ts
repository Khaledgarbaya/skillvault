export type FindingSeverity = "low" | "medium" | "high" | "critical";

export type FindingCategory =
  | "secrets"
  | "dangerous-code"
  | "prompt-override"
  | "exfiltration"
  | "hidden-instructions";

export type ScanStatus = "pass" | "warn" | "fail";

export interface SkillFile {
  path: string;
  content: string;
}

export interface ScanConfig {
  rules?: Record<string, "off" | "warn" | "error">;
  ignore?: string[];
}

export interface ScanFinding {
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  file: string;
  line: number;
  column?: number;
  message: string;
  snippet: string;
}

export interface ScanResult {
  status: ScanStatus;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: ScanFinding[];
  categories: {
    secrets: ScanStatus;
    dangerousCode: ScanStatus;
    promptOverride: ScanStatus;
    exfiltration: ScanStatus;
    hiddenInstructions: ScanStatus;
  };
  scannedFiles: number;
  scanDuration: number;
  engineVersion: string;
}
