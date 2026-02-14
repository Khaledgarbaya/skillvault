import { Command } from "commander";
import chalk from "chalk";
import { registerScan } from "./commands/scan.js";
import { registerInit } from "./commands/init.js";
import { registerCi } from "./commands/ci.js";

const program = new Command();

program
  .name("skscan")
  .version("0.1.0")
  .description("Security scanner for AI agent skills");

// scan is the default command (argument on program itself)
registerScan(program);
registerInit(program);
registerCi(program);

program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (err: unknown) {
  if (err instanceof Error && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "commander.helpDisplayed" || code === "commander.version") {
      process.exit(0);
    }
  }
  console.error(chalk.red((err as Error).message ?? "An unexpected error occurred"));
  process.exit(1);
}
