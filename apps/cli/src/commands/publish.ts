import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import * as tar from "tar-stream";
import { Writable } from "node:stream";
import { parseFrontmatter, MAX_TARBALL_SIZE } from "@skvault/shared";
import { api, ApiError } from "../api.js";
import { getConfig, getToken } from "../config.js";

const EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  ".skills",
  ".DS_Store",
  "Thumbs.db",
];

export function registerPublish(program: Command): void {
  program
    .command("publish")
    .description("Publish a skill to the registry")
    .option("-d, --dir <path>", "Skill directory", ".")
    .option("-v, --version <version>", "Version to publish")
    .action(async (opts: { dir: string; version?: string }) => {
      if (!getToken()) {
        console.error(
          chalk.red("Not logged in. Run ") + chalk.bold("sk login") + chalk.red(" first."),
        );
        process.exit(1);
      }

      const config = getConfig();
      const dir = resolve(opts.dir);

      // Check SKILL.md exists
      const skillMdPath = join(dir, "SKILL.md");
      if (!existsSync(skillMdPath)) {
        console.error(chalk.red("SKILL.md not found in ") + chalk.dim(dir));
        process.exit(1);
      }

      // Parse frontmatter
      const skillMdContent = readFileSync(skillMdPath, "utf-8");
      const frontmatter = parseFrontmatter(skillMdContent);
      if (!frontmatter) {
        console.error(chalk.red("SKILL.md must have valid frontmatter with 'name' and 'description'"));
        process.exit(1);
      }

      const name = frontmatter.name;
      const version = opts.version ?? frontmatter.version;

      if (!version) {
        console.error(chalk.red("Version required. Use --version or add 'version' to SKILL.md frontmatter"));
        process.exit(1);
      }

      console.log(chalk.bold(`Publishing ${chalk.green(name)}@${chalk.cyan(version)}`));

      // Create tar.gz
      const spinner = ora("Creating package...").start();

      let tarballBuffer: Buffer;
      try {
        tarballBuffer = await createTarball(dir);
      } catch (err) {
        spinner.fail("Failed to create package");
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      if (tarballBuffer.length > MAX_TARBALL_SIZE) {
        spinner.fail(`Package too large (${formatSize(tarballBuffer.length)}, max ${formatSize(MAX_TARBALL_SIZE)})`);
        process.exit(1);
      }

      const hash = createHash("sha256").update(tarballBuffer).digest("hex");
      spinner.succeed(
        `Package created (${formatSize(tarballBuffer.length)}, sha256:${hash.slice(0, 12)}...)`,
      );

      // Upload
      const uploadSpinner = ora("Publishing...").start();

      try {
        const owner = config.username;
        if (!owner) {
          uploadSpinner.fail("Username not set. Run sk login again.");
          process.exit(1);
        }

        const formData = new FormData();
        formData.append("version", version);
        formData.append(
          "tarball",
          new Blob([tarballBuffer], { type: "application/gzip" }),
          `${name}-${version}.tar.gz`,
        );

        const res = await api(`/api/v1/skills/${owner}/${name}/publish`, {
          method: "POST",
          body: formData,
          raw: true,
        });

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (typeof body === "object" && body && "error" in body) {
              errorMsg = (body as { error: string }).error;
            }
          } catch {}

          // If skill doesn't exist, create it first
          if (res.status === 404) {
            uploadSpinner.text = "Creating skill...";
            const createRes = await api("/api/v1/skills", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                description: frontmatter.description,
              }),
            });
            if (!createRes.ok) {
              uploadSpinner.fail("Failed to create skill");
              process.exit(1);
            }

            // Retry publish
            uploadSpinner.text = "Publishing...";
            const retryForm = new FormData();
            retryForm.append("version", version);
            retryForm.append(
              "tarball",
              new Blob([tarballBuffer], { type: "application/gzip" }),
              `${name}-${version}.tar.gz`,
            );

            const retryRes = await api(
              `/api/v1/skills/${owner}/${name}/publish`,
              { method: "POST", body: retryForm, raw: true },
            );

            if (!retryRes.ok) {
              let msg = `HTTP ${retryRes.status}`;
              try {
                const b = await retryRes.json();
                if (typeof b === "object" && b && "error" in b) msg = (b as { error: string }).error;
              } catch {}
              uploadSpinner.fail(msg);
              process.exit(1);
            }

            const result = await retryRes.json() as { version: string; scan?: { status: string } };
            uploadSpinner.succeed(`Published ${chalk.green(name)}@${chalk.cyan(result.version)}`);
            printScanResult(result.scan);
            return;
          }

          uploadSpinner.fail(errorMsg);
          process.exit(1);
        }

        const result = await res.json() as { version: string; scan?: { status: string } };
        uploadSpinner.succeed(`Published ${chalk.green(name)}@${chalk.cyan(result.version)}`);
        printScanResult(result.scan);
      } catch (err) {
        if (err instanceof ApiError) {
          uploadSpinner.fail(err.message);
        } else {
          uploadSpinner.fail((err as Error).message);
        }
        process.exit(1);
      }
    });
}

function printScanResult(scan?: { status: string }): void {
  if (!scan) return;
  const icon = scan.status === "pass" ? chalk.green("✓") : scan.status === "warn" ? chalk.yellow("⚠") : chalk.red("✗");
  console.log(`  Scan: ${icon} ${scan.status}`);
}

async function createTarball(dir: string): Promise<Buffer> {
  const pack = tar.pack();
  const files = collectFiles(dir, "");

  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    const content = readFileSync(fullPath);
    pack.entry({ name: file, size: stat.size, mtime: stat.mtime, mode: stat.mode }, content);
  }

  pack.finalize();

  // Pipe through gzip
  const gzip = createGzip({ level: 9 });
  const chunks: Buffer[] = [];

  const collector = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  await pipeline(pack, gzip, collector);
  return Buffer.concat(chunks);
}

function collectFiles(base: string, prefix: string): string[] {
  const entries = readdirSync(join(base, prefix), { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const name = entry.name as string;
    if (EXCLUDE_PATTERNS.includes(name)) continue;

    const relPath = prefix ? `${prefix}/${name}` : name;

    if (entry.isDirectory()) {
      files.push(...collectFiles(base, relPath));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
