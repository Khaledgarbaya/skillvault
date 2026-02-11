import type { Command } from "commander";
import chalk from "chalk";
import { apiJson } from "../api.js";

interface SkillItem {
  id: string;
  name: string;
  owner: string;
  description: string | null;
  downloadCount: number;
  visibility: string;
}

export function registerSearch(program: Command): void {
  program
    .command("search <query>")
    .description("Search for skills on the registry")
    .option("-l, --limit <n>", "Results per page", "20")
    .option("-p, --page <n>", "Page number", "1")
    .action(async (query: string, opts: { limit: string; page: string }) => {
      const result = await apiJson<{
        items: SkillItem[];
        page: number;
        limit: number;
      }>(`/api/v1/skills?q=${encodeURIComponent(query)}&limit=${opts.limit}&page=${opts.page}`);

      if (result.items.length === 0) {
        console.log(chalk.dim("No results found."));
        return;
      }

      // Table header
      console.log();
      console.log(
        chalk.dim("  NAME".padEnd(35)) +
          chalk.dim("OWNER".padEnd(18)) +
          chalk.dim("DOWNLOADS".padEnd(12)) +
          chalk.dim("DESCRIPTION"),
      );
      console.log(chalk.dim("  " + "─".repeat(80)));

      for (const item of result.items) {
        const name = chalk.green(item.name.padEnd(33));
        const owner = chalk.dim(item.owner.padEnd(16));
        const dl = String(item.downloadCount).padEnd(10);
        const desc = chalk.dim((item.description ?? "").slice(0, 40));
        console.log(`  ${name}${owner}${dl}${desc}`);
      }

      console.log();
      console.log(chalk.dim(`  Page ${result.page} • ${result.items.length} results`));
    });
}
