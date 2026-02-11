import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createInterface } from "node:readline";
import { getConfig, setConfig } from "../config.js";
import { apiJson } from "../api.js";

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("Authenticate with the SKVault registry")
    .option("--token <token>", "Provide an API token directly")
    .action(async (opts: { token?: string }) => {
      const config = getConfig();

      let token = opts.token;

      if (!token) {
        console.log(chalk.bold("Log in to SKVault"));
        console.log();
        console.log(`1. Open ${chalk.cyan(`${config.registry}/dashboard/tokens`)}`);
        console.log(`2. Create a new API token`);
        console.log(`3. Paste it below`);
        console.log();

        token = await prompt("API token: ");

        if (!token) {
          console.error(chalk.red("No token provided."));
          process.exit(1);
        }
      }

      token = token.trim();

      const spinner = ora("Verifying token...").start();

      try {
        const user = await apiJson<{ username: string; email: string }>(
          "/api/v1/auth/me",
          { headers: { Authorization: `Bearer ${token}` } },
        );

        setConfig({ token, username: user.username });
        spinner.succeed(`Logged in as ${chalk.green(user.username)} (${user.email})`);
      } catch {
        spinner.fail("Invalid token or unable to reach registry");
        process.exit(1);
      }
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
