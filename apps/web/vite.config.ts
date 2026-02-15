import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Read VITE_PUBLIC_* vars from .dev.vars so Vite can statically
 * replace import.meta.env references in the client bundle.
 * Wrangler reads .dev.vars at runtime for the Worker; Vite needs
 * them at build time for client-side code.
 */
function loadPublicEnvFromDevVars(): Record<string, string> {
  const devVarsPath = resolve(__dirname, ".dev.vars");
  if (!existsSync(devVarsPath)) return {};

  const define: Record<string, string> = {};
  for (const line of readFileSync(devVarsPath, "utf-8").split("\n")) {
    const match = line.match(/^(VITE_PUBLIC_\w+)=(.+)$/);
    if (match) {
      define[`import.meta.env.${match[1]}`] = JSON.stringify(match[2]);
    }
  }
  return define;
}

/**
 * Shim cloudflare:workers for the client build.
 * The route tree imports API routes which transitively pull in
 * cloudflare:workers through the auth chain. The SSR environment
 * resolves it natively; the client gets an empty stub.
 */
function cloudflareClientShim(): Plugin {
  return {
    name: "cloudflare-client-shim",
    resolveId(id) {
      if (id === "cloudflare:workers") {
        return "\0cloudflare:workers";
      }
    },
    load(id) {
      if (id === "\0cloudflare:workers") {
        return "export const env = {};";
      }
    },
    applyToEnvironment(environment) {
      return environment.name === "client";
    },
  };
}

export default defineConfig({
  define: loadPublicEnvFromDevVars(),
  server: { port: 3000 },
  plugins: [
    cloudflareClientShim(),
    tailwindcss(),
    tsconfigPaths(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
  ],
});
