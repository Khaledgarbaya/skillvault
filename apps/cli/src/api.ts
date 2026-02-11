import chalk from "chalk";
import { getConfig, getToken } from "./config.js";

const PKG_VERSION = "0.1.0";
const MAX_RETRIES = 3;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Shared HTTP client for the SKVault registry API.
 * Bearer auth, User-Agent, 401 → "Run sk login", 429 → retry, network → friendly message.
 */
export async function api(
  path: string,
  options: RequestInit & { raw?: boolean } = {},
): Promise<Response> {
  const config = getConfig();
  const token = getToken();
  const baseUrl = config.registry.replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options.headers);
  headers.set("User-Agent", `sk-cli/${PKG_VERSION}`);

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (res.status === 401) {
        console.error(
          chalk.red("Authentication required. Run ") +
            chalk.bold("sk login") +
            chalk.red(" first."),
        );
        process.exit(1);
      }

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "2", 10);
        const wait = Math.min(retryAfter, 30) * 1000;
        if (attempt < MAX_RETRIES - 1) {
          await sleep(wait);
          continue;
        }
      }

      if (!res.ok && !options.raw) {
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (typeof body === "object" && body && "error" in body) {
            message = (body as { error: string }).error;
          }
        } catch {
          // ignore parse errors
        }
        throw new ApiError(message, res.status);
      }

      return res;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      lastError = err as Error;

      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
    }
  }

  console.error(chalk.red("Network error: ") + (lastError?.message ?? "Unable to reach registry"));
  console.error(chalk.dim(`Registry: ${baseUrl}`));
  process.exit(1);
}

/**
 * Convenience: fetch JSON from the API.
 */
export async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await api(path, options);
  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
