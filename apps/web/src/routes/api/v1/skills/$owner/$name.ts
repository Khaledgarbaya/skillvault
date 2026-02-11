import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { jsonError } from "~/lib/api/response";
import {
  getSkillByOwnerAndName,
  getLatestVersion,
  getScanForVersion,
  updateSkill,
  deleteSkill,
  getTarballKeysForSkill,
} from "~/lib/db/queries";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/skills/$owner/$name")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string };
        context: LoggedContext;
      }) => {
        const db = drizzle(context.cloudflare.env.DB);
        const authResult = await optionalScopeFromRequest(request, "read");

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        const { skill, ownerUsername } = result;

        if (skill.visibility === "private") {
          if (!authResult || authResult.userId !== skill.ownerId) {
            return jsonError("Skill not found", 404);
          }
        }

        const latestVersion = await getLatestVersion(db, skill.id);
        const scan = latestVersion ? await getScanForVersion(db, latestVersion.id) : null;

        return Response.json({
          ...skill,
          owner: ownerUsername,
          latestVersion,
          scan,
        });
      },

      PATCH: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string };
        context: LoggedContext;
      }) => {
        const authResult = await requireScopeFromRequest(request, "publish");
        const db = drizzle(context.cloudflare.env.DB);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== authResult.userId) {
          return jsonError("Forbidden", 403);
        }

        const body = (await request.json()) as {
          description?: string;
          visibility?: "public" | "private";
          repositoryUrl?: string;
        };

        await updateSkill(db, result.skill.id, {
          description: body.description,
          visibility: body.visibility,
          repositoryUrl: body.repositoryUrl,
        });

        return Response.json({ ok: true });
      },

      DELETE: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string };
        context: LoggedContext;
      }) => {
        const authResult = await requireScopeFromRequest(request, "publish");
        const db = drizzle(context.cloudflare.env.DB);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== authResult.userId) {
          return jsonError("Forbidden", 403);
        }

        const tarballKeys = await getTarballKeysForSkill(db, result.skill.id);
        for (const key of tarballKeys) {
          await context.cloudflare.env.SKILLS_BUCKET.delete(key);
        }

        await deleteSkill(db, result.skill.id);

        return Response.json({ ok: true });
      },
    },
  },
});
