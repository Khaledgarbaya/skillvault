import type { Command } from "commander";
import chalk from "chalk";
import { clearToken, getToken } from "../config.js";

export function registerLogout(program: Command): void {
  program
    .command("logout")
    .description("Remove stored credentials")
    .action(() => {
      if (!getToken()) {
        console.log(chalk.dim("Not logged in."));
        return;
      }
      clearToken();
      console.log(chalk.green("Logged out."));
    });
}
