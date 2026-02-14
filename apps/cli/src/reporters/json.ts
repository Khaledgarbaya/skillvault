import type { ScanResult } from "@skvault/scanner";

export function reportJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
