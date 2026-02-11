import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

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
