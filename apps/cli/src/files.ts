import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, basename } from "node:path";
import type { SkillFile } from "@skvault/scanner";

const SCAN_EXTENSIONS = new Set([".md", ".sh", ".py", ".js", ".ts"]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "__pycache__",
  ".venv",
  "venv",
]);

export function discoverFiles(
  target: string,
  ignorePatterns?: string[],
): SkillFile[] {
  const stat = statSync(target);

  if (stat.isFile()) {
    return [{ path: basename(target), content: readFileSync(target, "utf-8") }];
  }

  const gitignorePatterns = loadGitignore(target);
  const allIgnore = [...gitignorePatterns, ...(ignorePatterns ?? [])];

  const files: SkillFile[] = [];
  walkDir(target, target, allIgnore, files);
  return files;
}

function walkDir(
  root: string,
  dir: string,
  ignorePatterns: string[],
  out: SkillFile[],
): void {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;

    // Skip dotfiles/dotdirs (except well-known config)
    if (name.startsWith(".")) continue;

    const fullPath = join(dir, name);
    const relPath = relative(root, fullPath);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      if (matchesAny(relPath + "/", ignorePatterns)) continue;
      walkDir(root, fullPath, ignorePatterns, out);
    } else if (entry.isFile()) {
      const ext = getExtension(name);
      if (!SCAN_EXTENSIONS.has(ext)) continue;
      if (matchesAny(relPath, ignorePatterns)) continue;
      out.push({ path: relPath, content: readFileSync(fullPath, "utf-8") });
    }
  }
}

function loadGitignore(dir: string): string[] {
  const gitignorePath = join(dir, ".gitignore");
  if (!existsSync(gitignorePath)) return [];

  return readFileSync(gitignorePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function matchesAny(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (simpleMatch(path, pattern)) return true;
  }
  return false;
}

function simpleMatch(path: string, pattern: string): boolean {
  // Normalize: strip leading /
  const p = pattern.startsWith("/") ? pattern.slice(1) : pattern;

  // Direct name match (no slash in pattern = match any segment)
  if (!p.includes("/") && !p.includes("*")) {
    return path.split("/").some((seg) => seg === p);
  }

  // Glob match
  const regexStr = p
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${regexStr}`).test(path);
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot);
}
