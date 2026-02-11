import type { Command } from "commander";
import chalk from "chalk";
import { existsSync, readdirSync, symlinkSync, unlinkSync, readlinkSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { readLockfile, writeLockfile } from "../lockfile.js";
import { symlinkToAgents } from "../agents.js";

export function registerRollback(program: Command): void {
  program
    .command("rollback <skill>")
    .description("Roll back a skill to its previous version")
    .action((skillArg: string) => {
      const cwd = process.cwd();

      // Parse owner/name or just name
      const name = skillArg.includes("/") ? skillArg.split("/")[1] : skillArg;
      const fullName = skillArg.includes("/") ? skillArg : undefined;

      const activeDir = join(cwd, ".skills", "active");
      const storeDir = join(cwd, ".skills", "store");
      const symlinkPath = join(activeDir, name);

      if (!existsSync(symlinkPath)) {
        console.error(chalk.red(`Skill "${name}" is not installed.`));
        process.exit(1);
      }

      // Read current hash from symlink
      let currentHash: string;
      try {
        const target = readlinkSync(symlinkPath);
        currentHash = basename(target);
      } catch {
        console.error(chalk.red("Could not read current skill symlink."));
        process.exit(1);
      }

      // Find all stored versions
      if (!existsSync(storeDir)) {
        console.error(chalk.red("No skill store found."));
        process.exit(1);
      }

      const storedHashes = readdirSync(storeDir).filter((h) => h !== currentHash);

      // Use lockfile to find the previous version's hash
      const lockfile = readLockfile(cwd);
      if (!lockfile) {
        console.error(chalk.red("No lockfile found. Cannot determine previous version."));
        process.exit(1);
      }

      // Find the lock entry for this skill
      const lockKey = fullName ?? Object.keys(lockfile.skills).find((k) => k.endsWith(`/${name}`));
      if (!lockKey || !lockfile.skills[lockKey]) {
        console.error(chalk.red(`No lockfile entry for "${name}".`));
        process.exit(1);
      }

      // Look for a different hash in the store
      if (storedHashes.length === 0) {
        console.error(chalk.red("No previous version found in store."));
        process.exit(1);
      }

      // Pick the most recent alternative (last stored)
      const previousHash = storedHashes[storedHashes.length - 1];
      const previousDir = join(storeDir, previousHash);

      // Swap symlink
      unlinkSync(symlinkPath);
      symlinkSync(resolve(previousDir), symlinkPath);

      // Update lockfile
      lockfile.skills[lockKey].hash = previousHash;
      writeLockfile(cwd, lockfile);

      symlinkToAgents(cwd);
      console.log(
        chalk.green(`Rolled back ${chalk.cyan(name)} to ${previousHash.slice(0, 8)}`),
      );
    });
}
