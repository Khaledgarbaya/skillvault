import type { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { createInterface } from "node:readline";
import { api, apiJson } from "../api.js";

interface TokenInfo {
  id: string;
  name: string;
  scopes: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export function registerToken(program: Command): void {
  const cmd = program
    .command("token")
    .description("Manage API tokens");

  cmd
    .command("create")
    .description("Create a new API token")
    .option("-n, --name <name>", "Token name")
    .option("-s, --scopes <scopes>", "Token scopes", "publish,read")
    .action(async (opts: { name?: string; scopes: string }) => {
      let name = opts.name;
      if (!name) {
        name = await prompt("Token name: ");
        if (!name) {
          console.error(chalk.red("Token name is required."));
          process.exit(1);
        }
      }

      const spinner = ora("Creating token...").start();
      try {
        const result = await apiJson<{ token: string; id: string; name: string }>(
          "/api/v1/auth/tokens",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, scopes: opts.scopes }),
          },
        );

        spinner.succeed("Token created");
        console.log();
        console.log(chalk.bold("Token: ") + chalk.green(result.token));
        console.log();
        console.log(chalk.yellow("This token will only be shown once. Store it securely."));
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });

  cmd
    .command("list")
    .description("List your API tokens")
    .action(async () => {
      const tokens = await apiJson<TokenInfo[]>("/api/v1/auth/tokens");

      if (tokens.length === 0) {
        console.log(chalk.dim("No tokens."));
        return;
      }

      console.log();
      console.log(
        chalk.dim("  NAME".padEnd(25)) +
          chalk.dim("SCOPES".padEnd(18)) +
          chalk.dim("CREATED".padEnd(14)) +
          chalk.dim("LAST USED"),
      );
      console.log(chalk.dim("  " + "─".repeat(70)));

      for (const t of tokens) {
        const name = t.name.padEnd(23);
        const scopes = chalk.dim(t.scopes.padEnd(16));
        const created = formatDate(t.createdAt).padEnd(12);
        const lastUsed = t.lastUsedAt ? formatDate(t.lastUsedAt) : chalk.dim("never");
        console.log(`  ${name}${scopes}${created}${lastUsed}`);
      }

      console.log();
    });

  cmd
    .command("revoke <id>")
    .description("Revoke an API token by ID")
    .action(async (id: string) => {
      const spinner = ora("Revoking token...").start();
      try {
        const res = await api(`/api/v1/auth/tokens/${id}`, {
          method: "DELETE",
          raw: true,
        });

        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (typeof body === "object" && body && "error" in body) {
              msg = (body as { error: string }).error;
            }
          } catch {}
          spinner.fail(msg);
          process.exit(1);
        }

        spinner.succeed("Token revoked");
      } catch (err) {
        spinner.fail((err as Error).message);
        process.exit(1);
      }
    });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
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
