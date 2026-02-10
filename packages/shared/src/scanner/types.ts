export type ScanStatus = "pass" | "fail" | "warn";

export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type FindingType =
  | "secrets"
  | "dangerous-script"
  | "prompt-override"
  | "exfiltration"
  | "hidden-content";

export type FindingCategory = "secrets" | "permissions" | "network" | "filesystem";

export interface ScanFinding {
  severity: FindingSeverity;
  type: FindingType;
  category: FindingCategory;
  file: string;
  line: number;
  detail: string;
  snippet: string;
}

export interface SkillFile {
  path: string;
  content: string;
}

export interface ScanOutput {
  status: ScanStatus;
  findings: ScanFinding[];
  secretsStatus: ScanStatus;
  secretsFindings: ScanFinding[];
  permissionsStatus: ScanStatus;
  permissionsFindings: ScanFinding[];
  networkStatus: ScanStatus;
  networkFindings: ScanFinding[];
  filesystemStatus: ScanStatus;
  filesystemFindings: ScanFinding[];
  overallStatus: ScanStatus;
}

/** DB-aligned report shape (matches scanResults table columns) */
export interface ScanReport {
  engineVersion: string;
  status: "pending" | "running" | "completed" | "failed";
  findings: ScanFinding[];
  secretsStatus: ScanStatus | null;
  permissionsStatus: ScanStatus | null;
  networkStatus: ScanStatus | null;
  filesystemStatus: ScanStatus | null;
  overallStatus: ScanStatus | null;
}
