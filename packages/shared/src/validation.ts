export function validateSkillName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: "Skill name is required" };
  }
  if (name.length < 3) {
    return { valid: false, error: "Skill name must be at least 3 characters" };
  }
  if (name.length > 50) {
    return { valid: false, error: "Skill name must be 50 characters or fewer" };
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: "Skill name must contain only lowercase letters, numbers, and hyphens" };
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    return { valid: false, error: "Skill name must not start or end with a hyphen" };
  }
  return { valid: true };
}

export function validateVersion(version: string): { valid: boolean; error?: string } {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { valid: false, error: "Version must follow semver format (e.g. 1.0.0)" };
  }
  return { valid: true };
}

export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) {
    throw new Error(`Invalid semver: ${!pa ? a : b}`);
  }
  for (const key of ["major", "minor", "patch"] as const) {
    if (pa[key] > pb[key]) return 1;
    if (pa[key] < pb[key]) return -1;
  }
  return 0;
}

export function resolveSemverRange(constraint: string, versions: string[]): string | null {
  const sorted = [...versions].sort((a, b) => compareSemver(b, a));
  const trimmed = constraint.trim();

  // Exact match: 1.2.3
  if (/^\d+\.\d+\.\d+$/.test(trimmed)) {
    return sorted.find((v) => v === trimmed) ?? null;
  }

  // Caret: ^1.2.3
  const caretMatch = trimmed.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
  if (caretMatch) {
    const major = parseInt(caretMatch[1], 10);
    const minor = parseInt(caretMatch[2], 10);
    const patch = parseInt(caretMatch[3], 10);

    return sorted.find((v) => {
      const p = parseVersion(v);
      if (!p) return false;
      if (major > 0) {
        // ^1.2.3 → >=1.2.3 <2.0.0
        return p.major === major && compareSemver(v, `${major}.${minor}.${patch}`) >= 0;
      }
      // ^0.x.y pins minor (npm behavior)
      return p.major === 0 && p.minor === minor && p.patch >= patch;
    }) ?? null;
  }

  // Tilde: ~1.2.3
  const tildeMatch = trimmed.match(/^~(\d+)\.(\d+)\.(\d+)$/);
  if (tildeMatch) {
    const major = parseInt(tildeMatch[1], 10);
    const minor = parseInt(tildeMatch[2], 10);
    const patch = parseInt(tildeMatch[3], 10);

    return sorted.find((v) => {
      const p = parseVersion(v);
      if (!p) return false;
      return p.major === major && p.minor === minor && p.patch >= patch;
    }) ?? null;
  }

  // Range: >=1.0.0 <2.0.0
  const rangeMatch = trimmed.match(/^>=(\d+\.\d+\.\d+)\s+<(\d+\.\d+\.\d+)$/);
  if (rangeMatch) {
    const lower = rangeMatch[1];
    const upper = rangeMatch[2];

    return sorted.find((v) => {
      return compareSemver(v, lower) >= 0 && compareSemver(v, upper) < 0;
    }) ?? null;
  }

  return null;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  [key: string]: string;
}

export function parseFrontmatter(content: string): SkillFrontmatter | null {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const block = match[1];
  const result: Record<string, string> = {};

  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) result[key] = value;
  }

  if (!result.name || !result.description) return null;

  return result as SkillFrontmatter;
}

export const MAX_TARBALL_SIZE = 5 * 1024 * 1024;

export function validateTarballSize(bytes: number): boolean {
  return bytes <= MAX_TARBALL_SIZE;
}
