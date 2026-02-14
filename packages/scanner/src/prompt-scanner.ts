import type { ScanFinding, SkillFile } from "./types.js";
import { scanPromptOverride } from "./rules/prompt-override.js";
import { scanExfiltration } from "./rules/exfiltration.js";
import { scanHiddenInstructions } from "./rules/hidden-instructions.js";

export function scanPrompt(files: SkillFile[]): ScanFinding[] {
  return [
    ...scanPromptOverride(files),
    ...scanExfiltration(files),
    ...scanHiddenInstructions(files),
  ];
}
