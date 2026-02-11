import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar-stream";
import { parse as parseYaml } from "yaml";
import { resolveSemverRange } from "@skvault/shared";
import { api, apiJson } from "../api.js";
import { readLockfile, writeLockfile, type Lockfile, type LockEntry } from "../lockfile.js";
import { symlinkToAgents } from "../agents.js";

export function registerInstall(program: Command): void {
  program
    .command("install")
    .description("Install all skills from skillfile.yaml")
    .option("--frozen", "Use lockfile only, fail if out of sync")
    .action(async (opts: { frozen?: boolean }) => {
      const cwd = process.cwd();
      const skillfilePath = join(cwd, "skillfile.yaml");

      if (!existsSync(skillfilePath)) {
        console.error(chalk.red("No skillfile.yaml found. Run ") + chalk.bold("sk init") + chalk.red(" first."));
        process.exit(1);
      }

      const doc = parseYaml(readFileSync(skillfilePath, "utf-8")) as {
        skills?: Record<string, string>;
      };

      const skills = doc?.skills ?? {};
      const entries = Object.entries(skills);

      if (entries.length === 0) {
        console.log(chalk.dim("No skills to install."));
        return;
      }

      const lockfile = readLockfile(cwd);

      if (opts.frozen) {
        if (!lockfile) {
          console.error(chalk.red("No lockfile found. Cannot use --frozen."));
          process.exit(1);
        }
        // Install from lockfile only
        const spinner = ora("Installing from lockfile...").start();
        let installed = 0;

        for (const [fullName, constraint] of entries) {
          const lockEntry = lockfile.skills[fullName];
          if (!lockEntry) {
            spinner.fail(`${fullName} not in lockfile. Run sk install without --frozen first.`);
            process.exit(1);
          }

          spinner.text = `Installing ${chalk.cyan(fullName)}@${lockEntry.version}...`;
          await installSkill(cwd, fullName, lockEntry);
          installed++;
        }

        symlinkToAgents(cwd);
        spinner.succeed(`Installed ${installed} skill${installed !== 1 ? "s" : ""} from lockfile`);
        return;
      }

      // Resolve and install
      const spinner = ora("Resolving dependencies...").start();
      const newLock: Lockfile = { version: 1, skills: {} };
      let installed = 0;

      for (const [fullName, constraint] of entries) {
        const [owner, name] = fullName.split("/");
        spinner.text = `Resolving ${chalk.cyan(fullName)}...`;

        // Check lockfile first
        if (lockfile?.skills[fullName]) {
          const lockEntry = lockfile.skills[fullName];
          // If locked version satisfies constraint, use it
          const match = resolveSemverRange(constraint, [lockEntry.version]);
          if (match) {
            newLock.skills[fullName] = lockEntry;
            spinner.text = `Installing ${chalk.cyan(fullName)}@${lockEntry.version}...`;
            await installSkill(cwd, fullName, lockEntry);
            installed++;
            continue;
          }
        }

        // Resolve fresh
        const versions = await apiJson<Array<{ version: string; contentHash: string; status: string }>>(
          `/api/v1/skills/${owner}/${name}/versions`,
        );

        const activeVersions = versions.filter((v) => v.status === "active");
        const resolved = resolveSemverRange(constraint, activeVersions.map((v) => v.version));

        if (!resolved) {
          spinner.fail(`No version of ${fullName} matches "${constraint}"`);
          process.exit(1);
        }

        const versionEntry = activeVersions.find((v) => v.version === resolved)!;
        const dlUrl = `/api/v1/skills/${owner}/${name}/${resolved}/dl`;

        spinner.text = `Downloading ${chalk.cyan(fullName)}@${chalk.green(resolved)}...`;
        const res = await api(dlUrl, { raw: true });
        if (!res.ok) {
          spinner.fail(`Download failed for ${fullName}: HTTP ${res.status}`);
          process.exit(1);
        }

        const tarballBuffer = Buffer.from(await res.arrayBuffer());
        const hash = createHash("sha256").update(tarballBuffer).digest("hex");

        if (hash !== versionEntry.contentHash) {
          spinner.fail(`Hash mismatch for ${fullName}`);
          process.exit(1);
        }

        // Extract
        const storeDir = join(cwd, ".skills", "store", hash);
        if (!existsSync(storeDir)) {
          mkdirSync(storeDir, { recursive: true });
          await extractTarball(tarballBuffer, storeDir);
        }

        // Symlink
        const activeDir = join(cwd, ".skills", "active");
        mkdirSync(activeDir, { recursive: true });
        const symlinkPath = join(activeDir, name);
        if (existsSync(symlinkPath)) unlinkSync(symlinkPath);
        symlinkSync(resolve(storeDir), symlinkPath);

        const lockEntry: LockEntry = { owner, name, version: resolved, hash, resolved: dlUrl };
        newLock.skills[fullName] = lockEntry;
        installed++;
      }

      writeLockfile(cwd, newLock);
      symlinkToAgents(cwd);
      spinner.succeed(`Installed ${installed} skill${installed !== 1 ? "s" : ""}`);
    });
}

async function installSkill(cwd: string, fullName: string, entry: LockEntry): Promise<void> {
  const storeDir = join(cwd, ".skills", "store", entry.hash);

  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true });
    const res = await api(entry.resolved, { raw: true });
    if (!res.ok) throw new Error(`Download failed for ${fullName}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await extractTarball(buffer, storeDir);
  }

  const activeDir = join(cwd, ".skills", "active");
  mkdirSync(activeDir, { recursive: true });
  const symlinkPath = join(activeDir, entry.name);
  if (existsSync(symlinkPath)) unlinkSync(symlinkPath);
  symlinkSync(resolve(storeDir), symlinkPath);
}

async function extractTarball(tarballBuffer: Buffer, outDir: string): Promise<void> {
  const extract = tar.extract();
  const gunzip = createGunzip();

  const done = new Promise<void>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      if (header.type === "file" && header.name) {
        let filePath = header.name.replace(/^[^/]+\//, "");
        filePath = filePath.replace(/^\.\//, "");
        if (!filePath || filePath.includes("..")) {
          stream.resume();
          next();
          return;
        }

        const fullPath = join(outDir, filePath);
        const dir = join(fullPath, "..");
        mkdirSync(dir, { recursive: true });

        const chunks: Buffer[] = [];
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => {
          writeFileSync(fullPath, Buffer.concat(chunks));
          next();
        });
      } else {
        stream.resume();
        next();
      }
    });

    extract.on("finish", resolve);
    extract.on("error", reject);
  });

  const bufferStream = Readable.from(tarballBuffer);
  await pipeline(bufferStream, gunzip, extract);
  await done;
}
