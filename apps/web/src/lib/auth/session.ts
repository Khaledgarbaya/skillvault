import { createServerFn } from "@tanstack/react-start";
import { cloudflareMiddleware } from "~/lib/middleware/cloudflare";
import { createAuth } from "~/lib/auth/server";

export const getSessionFn = createServerFn({ method: "GET" })
  .middleware([cloudflareMiddleware])
  .handler(async ({ request, context }) => {
    const auth = createAuth(context.cloudflare.env);
    const session = await auth.api.getSession({
      headers: request!.headers,
    });
    return session;
  });
