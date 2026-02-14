import type { ScanFinding, SkillFile } from "./types.js";
import { scanSecrets } from "./rules/secrets.js";
import { scanDangerousCode } from "./rules/dangerous-code.js";

export function scanCode(files: SkillFile[]): ScanFinding[] {
  return [...scanSecrets(files), ...scanDangerousCode(files)];
}
