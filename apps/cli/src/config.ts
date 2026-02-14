import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ScanConfig } from "@skvault/scanner";

const CONFIG_FILES = [
  ".skscanrc.json",
  ".skscanrc.yml",
  ".skscanrc.yaml",
];

export function loadConfig(dir: string, configPath?: string): ScanConfig {
  if (configPath) {
    return readConfigFile(configPath);
  }

  // Check well-known config files
  for (const name of CONFIG_FILES) {
    const full = join(dir, name);
    if (existsSync(full)) return readConfigFile(full);
  }

  // Check package.json "skscan" key
  const pkgPath = join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.skscan) return normalizeConfig(pkg.skscan);
    } catch {
      // ignore malformed package.json
    }
  }

  // Check .config/skscan.json
  const dotConfig = join(dir, ".config", "skscan.json");
  if (existsSync(dotConfig)) return readConfigFile(dotConfig);

  return {};
}

export function mergeCliFlags(
  config: ScanConfig,
  ignoreRules?: string,
): ScanConfig {
  if (!ignoreRules) return config;

  const rules = { ...config.rules };
  for (const id of ignoreRules.split(",")) {
    const trimmed = id.trim();
    if (trimmed) rules[trimmed] = "off";
  }

  return { ...config, rules };
}

function readConfigFile(path: string): ScanConfig {
  const raw = readFileSync(path, "utf-8");

  if (path.endsWith(".yml") || path.endsWith(".yaml")) {
    return normalizeConfig(parseYaml(raw) ?? {});
  }

  const parsed = JSON.parse(raw);
  // Strip $schema key
  const { $schema: _, ...rest } = parsed;
  return normalizeConfig(rest);
}

function normalizeConfig(raw: Record<string, unknown>): ScanConfig {
  const config: ScanConfig = {};

  if (raw.rules && typeof raw.rules === "object") {
    config.rules = raw.rules as Record<string, "off" | "warn" | "error">;
  }

  if (Array.isArray(raw.ignore)) {
    config.ignore = raw.ignore.filter(
      (x): x is string => typeof x === "string",
    );
  }

  return config;
}
