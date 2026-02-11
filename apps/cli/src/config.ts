import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

export interface Config {
  token?: string;
  registry: string;
  username?: string;
}

const DEFAULT_CONFIG: Config = {
  registry: "https://skv.sh",
};

/**
 * Resolve the config directory following XDG Base Directory spec.
 * Primary: $XDG_CONFIG_HOME/skv/ (defaults to ~/.config/skv/)
 */
export function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  const dir = join(xdg, "skv");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getConfigPath(): string {
  return join(getConfigDir(), "config.json");
}

function getLegacyConfigPath(): string {
  return join(homedir(), ".skvrc");
}

export function getConfig(): Config {
  const configPath = getConfigPath();

  // Try XDG path first
  if (existsSync(configPath)) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(configPath, "utf-8")) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  // Fallback: read legacy ~/.skvrc (read-only — new writes go to .config/skv/)
  const legacyPath = getLegacyConfigPath();
  if (existsSync(legacyPath)) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(legacyPath, "utf-8")) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  return { ...DEFAULT_CONFIG };
}

export function setConfig(partial: Partial<Config>): void {
  const current = getConfig();
  const merged = { ...current, ...partial };
  writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2) + "\n");
}

export function getToken(): string | undefined {
  return getConfig().token;
}

export function setToken(token: string): void {
  setConfig({ token });
}

export function clearToken(): void {
  const config = getConfig();
  delete config.token;
  delete config.username;
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2) + "\n");
}
