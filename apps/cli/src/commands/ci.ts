import type { Command } from "commander";
import { resolve } from "node:path";
import { appendFileSync } from "node:fs";
import { scanSkill } from "@skvault/scanner";
import type { ScanFinding } from "@skvault/scanner";
import { loadConfig } from "../config.js";
import { discoverFiles } from "../files.js";
import { reportJson } from "../reporters/json.js";

export function registerCi(program: Command): void {
  program
    .command("ci [path]")
    .description("CI mode — strict scanning with JSON output and GitHub Actions annotations")
    .option("-c, --config <path>", "path to config file")
    .action(async (path: string = ".", opts: { config?: string }) => {
      await runCi(path, opts);
    });
}

async function runCi(
  path: string,
  opts: { config?: string },
): Promise<void> {
  const target = resolve(path);

  try {
    const config = loadConfig(target, opts.config);
    const files = discoverFiles(target, config.ignore);

    if (files.length === 0) {
      console.error("No scannable files found.");
      process.exit(2);
    }

    const result = scanSkill(files, config);

    // Always output JSON
    console.log(reportJson(result));

    // GitHub Actions annotations
    const isGitHubActions = !!process.env.GITHUB_ACTIONS;
    if (isGitHubActions) {
      for (const f of result.findings) {
        const level = f.severity === "critical" || f.severity === "high" ? "error" : "warning";
        const annotation = `::${level} file=${f.file},line=${f.line}::${f.ruleId}: ${f.message}`;
        console.log(annotation);
      }
    }

    // GitHub Step Summary
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      const md = buildMarkdownSummary(result.findings, result.scannedFiles, result.status);
      appendFileSync(summaryPath, md);
    }

    // CI mode is always strict: exit 1 on any finding
    if (result.findings.length > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(2);
  }
}

function buildMarkdownSummary(
  findings: ScanFinding[],
  scannedFiles: number,
  status: string,
): string {
  const lines: string[] = [];
  lines.push("## skscan Results\n");
  lines.push(`**Status:** ${status.toUpperCase()} | **Files scanned:** ${scannedFiles} | **Findings:** ${findings.length}\n`);

  if (findings.length > 0) {
    lines.push("| Severity | Rule | File | Line | Message |");
    lines.push("|----------|------|------|------|---------|");
    for (const f of findings) {
      lines.push(`| ${f.severity} | \`${f.ruleId}\` | \`${f.file}\` | ${f.line} | ${f.message} |`);
    }
  } else {
    lines.push("No issues found.");
  }

  lines.push("");
  return lines.join("\n");
}
