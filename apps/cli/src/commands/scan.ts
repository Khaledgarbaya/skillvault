import type { Command } from "commander";
import { resolve } from "node:path";
import { scanSkill } from "@skvault/scanner";
import { loadConfig, mergeCliFlags } from "../config.js";
import { discoverFiles } from "../files.js";
import { reportPretty } from "../reporters/pretty.js";
import { reportJson } from "../reporters/json.js";
import { reportSarif } from "../reporters/sarif.js";
import { generateBadge } from "../badge.js";

type Format = "pretty" | "json" | "sarif";

export function registerScan(program: Command): void {
  program
    .argument("[path]", "file or directory to scan", ".")
    .option("-f, --format <format>", "output format (pretty, json, sarif)", "pretty")
    .option("-s, --strict", "exit 1 on any finding (not just critical/high)")
    .option("--ignore <rules>", "comma-separated rule IDs to ignore")
    .option("-c, --config <path>", "path to config file")
    .option("--badge", "output shields.io SVG badge instead of report")
    .action(async (path: string, opts: { format: Format; strict?: boolean; ignore?: string; config?: string; badge?: boolean }) => {
      await runScan(path, opts);
    });
}

export async function runScan(
  path: string,
  opts: { format: Format; strict?: boolean; ignore?: string; config?: string; badge?: boolean },
): Promise<void> {
  const target = resolve(path);

  try {
    const config = mergeCliFlags(loadConfig(target, opts.config), opts.ignore);
    const files = discoverFiles(target, config.ignore);

    if (files.length === 0) {
      console.error("No scannable files found.");
      process.exit(2);
    }

    const result = scanSkill(files, config);

    if (opts.badge) {
      process.stdout.write(generateBadge(result.status));
      process.exit(0);
    }

    switch (opts.format) {
      case "json":
        console.log(reportJson(result));
        break;
      case "sarif":
        console.log(reportSarif(result));
        break;
      default:
        console.log(reportPretty(result));
        break;
    }

    // Exit code: 0=pass, 1=fail
    if (result.status === "fail") process.exit(1);
    if (opts.strict && result.findings.length > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(2);
  }
}
