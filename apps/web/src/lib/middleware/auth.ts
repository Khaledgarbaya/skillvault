import { createMiddleware } from "@tanstack/react-start";
import { auth } from "~/lib/auth/server";
import type { Logger } from "~/lib/logger";

export const authMiddleware = createMiddleware().server(
  async ({ request, next, context }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Enrich wide event with user identity
    const logger = (context as { logger?: Logger }).logger;
    if (logger) {
      logger.setUser({
        id: session.user.id,
        email: session.user.email,
        username: (session.user as { username?: string }).username ?? undefined,
      });
    }

    return next({ context: { session } });
  },
);
