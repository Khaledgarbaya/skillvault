import type { Command } from "commander";
import chalk from "chalk";
import { api } from "../api.js";

export function registerDiff(program: Command): void {
  program
    .command("diff <skill> <v1> <v2>")
    .description("Show diff between two versions of a skill")
    .action(async (skill: string, v1: string, v2: string) => {
      const parts = skill.split("/");
      if (parts.length !== 2) {
        console.error(chalk.red("Skill must be in format: owner/name"));
        process.exit(1);
      }

      const [owner, name] = parts;
      const res = await api(
        `/api/v1/skills/${owner}/${name}/diff/${v1}/${v2}`,
        { raw: true },
      );

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (typeof body === "object" && body && "error" in body) {
            msg = (body as { error: string }).error;
          }
        } catch {}
        console.error(chalk.red(msg));
        process.exit(1);
      }

      const diff = await res.text();

      // Colorize unified diff output
      for (const line of diff.split("\n")) {
        if (line.startsWith("---") || line.startsWith("+++")) {
          console.log(chalk.bold(line));
        } else if (line.startsWith("+")) {
          console.log(chalk.green(line));
        } else if (line.startsWith("-")) {
          console.log(chalk.red(line));
        } else {
          console.log(line);
        }
      }
    });
}
