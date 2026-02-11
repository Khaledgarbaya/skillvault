import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { validateSkillName } from "@skvault/shared";
import { jsonError } from "~/lib/api/response";
import { listPublicSkills, getSkillByOwnerAndName, createSkill } from "~/lib/db/queries";
import { users } from "~/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/skills/")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({ request, context }: { request: Request; context: LoggedContext }) => {
        const db = drizzle(context.cloudflare.env.DB);
        const url = new URL(request.url);
        const q = url.searchParams.get("q") ?? undefined;
        const sort = url.searchParams.get("sort") ?? undefined;
        const page = parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
        const limit = parseInt(url.searchParams.get("limit") ?? "20", 10) || 20;

        const result = await listPublicSkills(db, { q, sort, page, limit });

        return Response.json({
          items: result.items.map(({ skill, ownerUsername }) => ({
            ...skill,
            owner: ownerUsername,
          })),
          page: result.page,
          limit: result.limit,
        });
      },

      POST: async ({ request, context }: { request: Request; context: LoggedContext }) => {
        const authResult = await requireScopeFromRequest(request, "publish");
        const db = drizzle(context.cloudflare.env.DB);
        const body = (await request.json()) as {
          name: string;
          description?: string;
          repositoryUrl?: string;
          visibility?: "public" | "private";
        };

        const validation = validateSkillName(body.name);
        if (!validation.valid) {
          return jsonError(validation.error!, 400);
        }

        // Look up the user's username
        const [user] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, authResult.userId))
          .limit(1);

        if (!user?.username) {
          return jsonError("User not found", 404);
        }

        const existing = await getSkillByOwnerAndName(db, user.username, body.name);
        if (existing) {
          return jsonError("A skill with this name already exists", 409);
        }

        const id = crypto.randomUUID();
        await createSkill(db, {
          id,
          ownerId: authResult.userId,
          name: body.name,
          description: body.description,
          repositoryUrl: body.repositoryUrl,
          visibility: body.visibility,
        });

        return new Response(
          JSON.stringify({
            id,
            name: body.name,
            owner: user.username,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
