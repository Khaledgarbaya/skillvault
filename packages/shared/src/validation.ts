export function validateSkillName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: "Skill name is required" };
  }
  if (name.length > 128) {
    return { valid: false, error: "Skill name must be 128 characters or fewer" };
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return { valid: false, error: "Skill name must contain only lowercase letters, numbers, and hyphens" };
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
