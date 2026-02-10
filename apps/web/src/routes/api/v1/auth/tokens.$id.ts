import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { requireAuth } from "~/lib/auth/middleware";
import { apiTokens } from "~/lib/db/schema";

export const Route = createFileRoute("/api/v1/auth/tokens/$id")({
  server: {
    handlers: {
      DELETE: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string };
      }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);

        const [token] = await db
          .select()
          .from(apiTokens)
          .where(
            and(
              eq(apiTokens.id, params.id),
              eq(apiTokens.userId, session.user.id),
            ),
          )
          .limit(1);

        if (!token) {
          return new Response(
            JSON.stringify({ error: "Token not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        await db.delete(apiTokens).where(eq(apiTokens.id, params.id));

        return Response.json({ success: true });
      },
    },
  },
});
