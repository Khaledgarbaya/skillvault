import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { validateSkillName } from "@skvault/shared";
import { requireAuth } from "~/lib/auth/middleware";
import { jsonError } from "~/lib/api/response";
import { listPublicSkills, getSkillByOwnerAndName, createSkill } from "~/lib/db/queries";

export const Route = createFileRoute("/api/v1/skills/")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const db = drizzle(env.DB);
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

      POST: async ({ request }: { request: Request }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);
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

        const existing = await getSkillByOwnerAndName(db, session.user.username, body.name);
        if (existing) {
          return jsonError("A skill with this name already exists", 409);
        }

        const id = crypto.randomUUID();
        await createSkill(db, {
          id,
          ownerId: session.user.id,
          name: body.name,
          description: body.description,
          repositoryUrl: body.repositoryUrl,
          visibility: body.visibility,
        });

        return new Response(
          JSON.stringify({
            id,
            name: body.name,
            owner: session.user.username,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
