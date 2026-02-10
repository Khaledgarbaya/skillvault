export type ScanStatus = "pass" | "fail" | "warn";

export interface ScanFinding {
  category: "secrets" | "permissions" | "network" | "filesystem";
  severity: ScanStatus;
  message: string;
  file?: string;
  line?: number;
}

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
