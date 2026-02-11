import { createMiddleware } from "@tanstack/react-start";
import { auth } from "~/lib/auth/server";

export const authMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      throw new Error("Unauthorized");
    }
    return next({ context: { session } });
  },
);
