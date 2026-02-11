import { existsSync, readdirSync, mkdirSync, symlinkSync, unlinkSync, readlinkSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Well-known agent skill directories.
 * When a skill is added, we symlink it into any detected agent dirs.
 */
const AGENT_SKILL_DIRS: { name: string; relPath: string }[] = [
  { name: "Claude", relPath: ".claude/skills" },
  { name: "Cursor", relPath: ".cursor/skills" },
];

/**
 * Detect which agent directories exist in the project root.
 */
export function detectAgents(projectDir: string): { name: string; skillDir: string }[] {
  const found: { name: string; skillDir: string }[] = [];
  for (const agent of AGENT_SKILL_DIRS) {
    const dir = join(projectDir, agent.relPath);
    const parentDir = join(projectDir, agent.relPath.split("/")[0]);
    if (existsSync(parentDir)) {
      found.push({ name: agent.name, skillDir: dir });
    }
  }
  return found;
}

/**
 * Symlink all active skills into detected agent skill directories.
 */
export function symlinkToAgents(projectDir: string): void {
  const activeDir = join(projectDir, ".skills", "active");
  if (!existsSync(activeDir)) return;

  const agents = detectAgents(projectDir);
  const skills = readdirSync(activeDir);

  for (const agent of agents) {
    if (!existsSync(agent.skillDir)) {
      mkdirSync(agent.skillDir, { recursive: true });
    }

    for (const skillName of skills) {
      const source = resolve(activeDir, skillName);
      const target = join(agent.skillDir, skillName);

      // Remove stale symlink if it exists
      if (existsSync(target)) {
        try {
          const existing = readlinkSync(target);
          if (existing === source) continue; // already correct
          unlinkSync(target);
        } catch {
          continue; // not a symlink, don't touch
        }
      }

      try {
        symlinkSync(source, target);
      } catch {
        // ignore errors (e.g. permission issues)
      }
    }
  }
}

/**
 * Remove a skill symlink from all agent directories.
 */
export function removeFromAgents(projectDir: string, skillName: string): void {
  const agents = detectAgents(projectDir);
  for (const agent of agents) {
    const target = join(agent.skillDir, skillName);
    if (existsSync(target)) {
      try {
        unlinkSync(target);
      } catch {
        // ignore
      }
    }
  }
}
