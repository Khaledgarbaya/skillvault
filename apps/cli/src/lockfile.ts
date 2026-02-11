import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface LockEntry {
  owner: string;
  name: string;
  version: string;
  hash: string;
  resolved: string; // download URL
}

export interface Lockfile {
  version: 1;
  skills: Record<string, LockEntry>; // key = "owner/name"
}

const LOCKFILE_NAME = "skillfile.lock";

export function readLockfile(dir: string): Lockfile | null {
  const path = join(dir, LOCKFILE_NAME);
  if (!existsSync(path)) return null;
  try {
    const content = readFileSync(path, "utf-8");
    return parseYaml(content) as Lockfile;
  } catch {
    return null;
  }
}

export function writeLockfile(dir: string, lockfile: Lockfile): void {
  const path = join(dir, LOCKFILE_NAME);
  writeFileSync(path, stringifyYaml(lockfile, { lineWidth: 0 }));
}

export function updateLockEntry(
  dir: string,
  key: string,
  entry: LockEntry,
): void {
  const lock = readLockfile(dir) ?? { version: 1, skills: {} };
  lock.skills[key] = entry;
  writeLockfile(dir, lock);
}

export function removeLockEntry(dir: string, key: string): void {
  const lock = readLockfile(dir);
  if (!lock) return;
  delete lock.skills[key];
  writeLockfile(dir, lock);
}
