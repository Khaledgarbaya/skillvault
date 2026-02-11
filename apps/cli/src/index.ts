import { Command } from "commander";
import chalk from "chalk";
import { registerLogin } from "./commands/login.js";
import { registerLogout } from "./commands/logout.js";
import { registerInit } from "./commands/init.js";
import { registerPublish } from "./commands/publish.js";
import { registerAdd } from "./commands/add.js";
import { registerInstall } from "./commands/install.js";
import { registerUpdate } from "./commands/update.js";
import { registerRollback } from "./commands/rollback.js";
import { registerSearch } from "./commands/search.js";
import { registerDiff } from "./commands/diff.js";
import { registerToken } from "./commands/token.js";

const program = new Command();

program
  .name("sk")
  .version("0.1.0")
  .description("SKVault — Skill registry for AI agents");

// Register all commands
registerLogin(program);
registerLogout(program);
registerInit(program);
registerPublish(program);
registerAdd(program);
registerInstall(program);
registerUpdate(program);
registerRollback(program);
registerSearch(program);
registerDiff(program);
registerToken(program);

// Global error handler
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err: unknown) {
  if (err instanceof Error && "code" in err) {
    const code = (err as { code: string }).code;
    // commander exits cleanly for --help and --version
    if (code === "commander.helpDisplayed" || code === "commander.version") {
      process.exit(0);
    }
  }
  console.error(chalk.red((err as Error).message ?? "An unexpected error occurred"));
  process.exit(1);
}
