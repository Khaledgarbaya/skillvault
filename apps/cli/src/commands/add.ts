import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import * as tar from "tar-stream";
import { Writable } from "node:stream";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { resolveSemverRange } from "@skvault/shared";
import { api, apiJson } from "../api.js";
import { updateLockEntry } from "../lockfile.js";
import { symlinkToAgents } from "../agents.js";

export function registerAdd(program: Command): void {
  program
    .command("add <skill>")
    .description("Add a skill (owner/name or owner/name@version)")
    .action(async (skillArg: string) => {
      const cwd = process.cwd();

      // Parse skill@version
      const atIdx = skillArg.lastIndexOf("@");
      let fullName: string;
      let versionConstraint: string | undefined;

      if (atIdx > 0) {
        fullName = skillArg.slice(0, atIdx);
        versionConstraint = skillArg.slice(atIdx + 1);
      } else {
        fullName = skillArg;
      }

      const parts = fullName.split("/");
      if (parts.length !== 2) {
        console.error(chalk.red("Skill must be in format: owner/name"));
        process.exit(1);
      }

      const [owner, name] = parts;

      const spinner = ora(`Resolving ${chalk.cyan(fullName)}...`).start();

      try {
        // Fetch available versions
        const versions = await apiJson<Array<{ version: string; contentHash: string; status: string }>>(
          `/api/v1/skills/${owner}/${name}/versions`,
        );

        const activeVersions = versions.filter((v) => v.status === "active");
        if (activeVersions.length === 0) {
          spinner.fail("No active versions found");
          process.exit(1);
        }

        const versionStrings = activeVersions.map((v) => v.version);

        // Resolve version
        let resolvedVersion: string | null;
        if (versionConstraint) {
          resolvedVersion = resolveSemverRange(versionConstraint, versionStrings);
          if (!resolvedVersion) {
            spinner.fail(`No version matching "${versionConstraint}"`);
            process.exit(1);
          }
        } else {
          // Latest
          resolvedVersion = versionStrings[0];
        }

        const versionEntry = activeVersions.find((v) => v.version === resolvedVersion)!;
        spinner.text = `Downloading ${chalk.cyan(fullName)}@${chalk.green(resolvedVersion)}...`;

        // Download tarball
        const dlUrl = `/api/v1/skills/${owner}/${name}/${resolvedVersion}/dl`;
        const res = await api(dlUrl, { raw: true });
        if (!res.ok) {
          spinner.fail(`Download failed: HTTP ${res.status}`);
          process.exit(1);
        }

        const tarballBuffer = Buffer.from(await res.arrayBuffer());

        // Verify hash
        const hash = createHash("sha256").update(tarballBuffer).digest("hex");
        if (hash !== versionEntry.contentHash) {
          spinner.fail("Hash mismatch — tarball may be corrupted");
          process.exit(1);
        }

        // Extract to .skills/store/{hash}/
        const storeDir = join(cwd, ".skills", "store", hash);
        if (!existsSync(storeDir)) {
          mkdirSync(storeDir, { recursive: true });
          await extractTarball(tarballBuffer, storeDir);
        }

        // Create/update symlink .skills/active/{name}
        const activeDir = join(cwd, ".skills", "active");
        mkdirSync(activeDir, { recursive: true });
        const symlinkPath = join(activeDir, name);

        if (existsSync(symlinkPath)) {
          unlinkSync(symlinkPath);
        }
        symlinkSync(resolve(storeDir), symlinkPath);

        // Update skillfile.yaml
        updateSkillfile(cwd, fullName, versionConstraint ?? `^${resolvedVersion}`);

        // Update lockfile
        updateLockEntry(cwd, fullName, {
          owner,
          name,
          version: resolvedVersion,
          hash,
          resolved: dlUrl,
        });

        // Symlink to agents
        symlinkToAgents(cwd);

        spinner.succeed(
          `Added ${chalk.green(fullName)}@${chalk.cyan(resolvedVersion)} (${hash.slice(0, 8)})`,
        );
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });
}

async function extractTarball(tarballBuffer: Buffer, outDir: string): Promise<void> {
  const extract = tar.extract();
  const gunzip = createGunzip();

  const done = new Promise<void>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      if (header.type === "file" && header.name) {
        // Strip leading directory if present
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

  await pipeline(
    Writable.toWeb(gunzip) as any,
    // We need to feed data manually
  ).catch(() => {});

  // Manual pipeline: feed buffer through gunzip → extract
  const { Readable } = await import("node:stream");
  const bufferStream = Readable.from(tarballBuffer);
  await pipeline(bufferStream, gunzip, extract);
  await done;
}

function updateSkillfile(cwd: string, fullName: string, constraint: string): void {
  const skillfilePath = join(cwd, "skillfile.yaml");

  let doc: { skills?: Record<string, string> } = { skills: {} };
  if (existsSync(skillfilePath)) {
    try {
      doc = parseYaml(readFileSync(skillfilePath, "utf-8")) ?? { skills: {} };
    } catch {
      doc = { skills: {} };
    }
  }

  if (!doc.skills) doc.skills = {};
  doc.skills[fullName] = constraint;

  writeFileSync(skillfilePath, stringifyYaml(doc, { lineWidth: 0 }));
}
