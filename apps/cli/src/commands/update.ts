import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar-stream";
import { createInterface } from "node:readline";
import { parse as parseYaml } from "yaml";
import { resolveSemverRange, compareSemver } from "@skvault/shared";
import { api, apiJson } from "../api.js";
import { readLockfile, writeLockfile, type LockEntry } from "../lockfile.js";
import { symlinkToAgents } from "../agents.js";

export function registerUpdate(program: Command): void {
  program
    .command("update [skill]")
    .description("Check for newer versions and update skills")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (skillArg: string | undefined, opts: { yes?: boolean }) => {
      const cwd = process.cwd();
      const skillfilePath = join(cwd, "skillfile.yaml");

      if (!existsSync(skillfilePath)) {
        console.error(chalk.red("No skillfile.yaml found."));
        process.exit(1);
      }

      const doc = parseYaml(readFileSync(skillfilePath, "utf-8")) as {
        skills?: Record<string, string>;
      };
      const skills = doc?.skills ?? {};
      const lockfile = readLockfile(cwd);

      // Filter to specific skill if provided
      const targets = skillArg
        ? Object.entries(skills).filter(([k]) => k === skillArg || k.endsWith(`/${skillArg}`))
        : Object.entries(skills);

      if (targets.length === 0) {
        console.log(chalk.dim(skillArg ? `Skill "${skillArg}" not found in skillfile.yaml` : "No skills to update."));
        return;
      }

      const spinner = ora("Checking for updates...").start();
      const updates: { fullName: string; current: string; latest: string; hash: string }[] = [];

      for (const [fullName, constraint] of targets) {
        const [owner, name] = fullName.split("/");
        const current = lockfile?.skills[fullName]?.version;

        const versions = await apiJson<Array<{ version: string; contentHash: string; status: string }>>(
          `/api/v1/skills/${owner}/${name}/versions`,
        );

        const activeVersions = versions.filter((v) => v.status === "active");
        const resolved = resolveSemverRange(constraint, activeVersions.map((v) => v.version));

        if (resolved && current && compareSemver(resolved, current) > 0) {
          const entry = activeVersions.find((v) => v.version === resolved)!;
          updates.push({ fullName, current, latest: resolved, hash: entry.contentHash });
        }
      }

      if (updates.length === 0) {
        spinner.succeed("All skills are up to date.");
        return;
      }

      spinner.stop();

      // Print update table
      console.log();
      console.log(chalk.bold("Available updates:"));
      console.log();
      for (const u of updates) {
        console.log(
          `  ${chalk.cyan(u.fullName)}  ${chalk.dim(u.current)} → ${chalk.green(u.latest)}`,
        );
      }
      console.log();

      if (!opts.yes) {
        const answer = await prompt(`Update ${updates.length} skill${updates.length !== 1 ? "s" : ""}? (y/N) `);
        if (answer.toLowerCase() !== "y") {
          console.log(chalk.dim("Cancelled."));
          return;
        }
      }

      const updateSpinner = ora("Updating...").start();
      const lock = lockfile ?? { version: 1 as const, skills: {} };

      for (const u of updates) {
        const [owner, name] = u.fullName.split("/");
        updateSpinner.text = `Updating ${chalk.cyan(u.fullName)}@${chalk.green(u.latest)}...`;

        const dlUrl = `/api/v1/skills/${owner}/${name}/${u.latest}/dl`;
        const res = await api(dlUrl, { raw: true });
        if (!res.ok) {
          updateSpinner.fail(`Download failed for ${u.fullName}`);
          process.exit(1);
        }

        const tarballBuffer = Buffer.from(await res.arrayBuffer());
        const hash = createHash("sha256").update(tarballBuffer).digest("hex");

        if (hash !== u.hash) {
          updateSpinner.fail(`Hash mismatch for ${u.fullName}`);
          process.exit(1);
        }

        const storeDir = join(cwd, ".skills", "store", hash);
        if (!existsSync(storeDir)) {
          mkdirSync(storeDir, { recursive: true });
          await extractTarball(tarballBuffer, storeDir);
        }

        const activeDir = join(cwd, ".skills", "active");
        mkdirSync(activeDir, { recursive: true });
        const symlinkPath = join(activeDir, name);
        if (existsSync(symlinkPath)) unlinkSync(symlinkPath);
        symlinkSync(resolve(storeDir), symlinkPath);

        lock.skills[u.fullName] = {
          owner,
          name,
          version: u.latest,
          hash,
          resolved: dlUrl,
        };
      }

      writeLockfile(cwd, lock);
      symlinkToAgents(cwd);
      updateSpinner.succeed(`Updated ${updates.length} skill${updates.length !== 1 ? "s" : ""}`);
    });
}

function prompt(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
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
        mkdirSync(join(fullPath, ".."), { recursive: true });
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

  await pipeline(Readable.from(tarballBuffer), gunzip, extract);
  await done;
}
