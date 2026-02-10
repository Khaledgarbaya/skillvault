import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { requireAuth } from "~/lib/auth/middleware";
import { apiTokens } from "~/lib/db/schema";

export const Route = createFileRoute("/api/v1/auth/tokens")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);

        const tokens = await db
          .select({
            id: apiTokens.id,
            name: apiTokens.name,
            scopes: apiTokens.scopes,
            lastUsedAt: apiTokens.lastUsedAt,
            createdAt: apiTokens.createdAt,
          })
          .from(apiTokens)
          .where(eq(apiTokens.userId, session.user.id));

        return Response.json(tokens);
      },

      POST: async ({ request }: { request: Request }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);
        const body = (await request.json()) as {
          name: string;
          scopes?: string;
        };

        if (!body.name) {
          return new Response(
            JSON.stringify({ error: "Token name is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const raw = crypto.randomUUID();
        const encoded = new TextEncoder().encode(raw);
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const tokenHash = hashArray
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        const id = crypto.randomUUID();

        await db.insert(apiTokens).values({
          id,
          userId: session.user.id,
          name: body.name,
          tokenHash,
          scopes: body.scopes ?? "publish",
          createdAt: new Date(),
        });

        return Response.json({ token: raw, id, name: body.name });
      },
    },
  },
});
