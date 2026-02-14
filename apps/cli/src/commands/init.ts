import type { Command } from "commander";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import chalk from "chalk";

const DEFAULT_CONFIG = {
  $schema: "https://skvault.dev/schemas/skscanrc.json",
  rules: {},
  ignore: ["node_modules/**", "dist/**", ".git/**"],
};

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Create a .skscanrc.json config file")
    .option("--force", "overwrite existing config file")
    .action((opts: { force?: boolean }) => {
      const target = join(process.cwd(), ".skscanrc.json");

      if (existsSync(target) && !opts.force) {
        console.error(
          chalk.yellow(".skscanrc.json already exists. Use --force to overwrite."),
        );
        process.exit(1);
      }

      writeFileSync(target, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
      console.log(chalk.green("Created .skscanrc.json"));
    });
}
