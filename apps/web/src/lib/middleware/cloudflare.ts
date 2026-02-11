import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

export const cloudflareMiddleware = createMiddleware().server(
  async ({ next }) => {
    return next({ context: { cloudflare: { env } } });
  },
);
