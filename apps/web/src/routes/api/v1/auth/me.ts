import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { users } from "~/lib/db/schema";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/auth/me")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({ request, context }: { request: Request; context: LoggedContext }) => {
        const authResult = await requireScopeFromRequest(request, "read");
        const db = drizzle(context.cloudflare.env.DB);

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, authResult.userId))
          .limit(1);

        if (!user) {
          return new Response(
            JSON.stringify({ error: "User not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        return Response.json({
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
        });
      },
    },
  },
});
