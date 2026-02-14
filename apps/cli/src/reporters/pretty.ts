import chalk from "chalk";
import type { ScanResult, ScanFinding, FindingSeverity, ScanStatus } from "@skvault/scanner";

const SEVERITY_COLORS: Record<FindingSeverity, (s: string) => string> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.dim,
};

const STATUS_COLORS: Record<ScanStatus, (s: string) => string> = {
  pass: chalk.green,
  warn: chalk.yellow,
  fail: chalk.red,
};

const CATEGORY_LABELS: Record<string, string> = {
  secrets: "Secrets",
  dangerousCode: "Dangerous Code",
  promptOverride: "Prompt Override",
  exfiltration: "Exfiltration",
  hiddenInstructions: "Hidden Instructions",
};

export function reportPretty(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold(`  skscan v${result.engineVersion}`));
  lines.push("");

  // Findings
  if (result.findings.length > 0) {
    for (const finding of result.findings) {
      lines.push(formatFinding(finding));
    }
    lines.push("");
  }

  // Category status
  for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
    const status = result.categories[key as keyof typeof result.categories];
    const color = STATUS_COLORS[status];
    const badge = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL";
    lines.push(`  ${color(badge.padEnd(5))} ${label}`);
  }

  lines.push("");

  // Footer
  const { summary, scannedFiles, scanDuration, status } = result;
  const parts: string[] = [];
  if (summary.critical) parts.push(chalk.red(`${summary.critical} critical`));
  if (summary.high) parts.push(chalk.red(`${summary.high} high`));
  if (summary.medium) parts.push(chalk.yellow(`${summary.medium} medium`));
  if (summary.low) parts.push(chalk.dim(`${summary.low} low`));

  const findingsLine = parts.length > 0
    ? parts.join(", ")
    : chalk.green("no issues found");

  lines.push(`  ${chalk.bold("Findings:")} ${findingsLine}`);
  lines.push(`  ${chalk.bold("Files:")}    ${scannedFiles} scanned`);
  lines.push(`  ${chalk.bold("Duration:")} ${scanDuration}ms`);
  lines.push("");

  const resultColor = STATUS_COLORS[status];
  const resultLabel = status.toUpperCase();
  lines.push(`  ${resultColor(chalk.bold(`Result: ${resultLabel}`))}`);
  lines.push("");

  return lines.join("\n");
}

function formatFinding(f: ScanFinding): string {
  const color = SEVERITY_COLORS[f.severity];
  const badge = color(` ${f.severity.toUpperCase()} `.padEnd(10));
  const rule = chalk.dim(f.ruleId);
  const location = chalk.cyan(`${f.file}:${f.line}`);
  const snippet = f.snippet ? `\n    ${chalk.dim(f.snippet.trim())}` : "";

  return `  ${badge} ${rule}\n    ${location} ${f.message}${snippet}`;
}
