import type { Command } from "commander";
import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";

const SKILLFILE_NAME = "skillfile.yaml";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize a skill project or skill dependencies")
    .action(() => {
      const cwd = process.cwd();
      const skillfilePath = join(cwd, SKILLFILE_NAME);

      if (existsSync(skillfilePath)) {
        console.log(chalk.dim(`${SKILLFILE_NAME} already exists.`));
        return;
      }

      const content = stringifyYaml({
        skills: {},
      });

      writeFileSync(skillfilePath, content);
      console.log(chalk.green(`Created ${SKILLFILE_NAME}`));

      // Update .gitignore
      const gitignorePath = join(cwd, ".gitignore");
      const entries = [".skills/store/", "skillfile.lock"];

      if (existsSync(gitignorePath)) {
        const existing = readFileSync(gitignorePath, "utf-8");
        const missing = entries.filter((e) => !existing.includes(e));
        if (missing.length > 0) {
          appendFileSync(
            gitignorePath,
            "\n# SKVault\n" + missing.join("\n") + "\n",
          );
          console.log(chalk.green("Updated .gitignore"));
        }
      } else {
        writeFileSync(
          gitignorePath,
          "# SKVault\n" + entries.join("\n") + "\n",
        );
        console.log(chalk.green("Created .gitignore"));
      }
    });
}
