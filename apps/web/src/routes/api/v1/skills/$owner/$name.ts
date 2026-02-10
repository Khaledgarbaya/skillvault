import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { requireAuth, optionalAuth } from "~/lib/auth/middleware";
import { jsonError } from "~/lib/api/response";
import {
  getSkillByOwnerAndName,
  getLatestVersion,
  getScanForVersion,
  updateSkill,
  deleteSkill,
  getTarballKeysForSkill,
} from "~/lib/db/queries";

export const Route = createFileRoute("/api/v1/skills/$owner/$name")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { owner: string; name: string } }) => {
        const db = drizzle(env.DB);
        const session = await optionalAuth(request);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        const { skill, ownerUsername } = result;

        if (skill.visibility === "private") {
          if (!session || session.user.id !== skill.ownerId) {
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

      PATCH: async ({ request, params }: { request: Request; params: { owner: string; name: string } }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== session.user.id) {
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

      DELETE: async ({ request, params }: { request: Request; params: { owner: string; name: string } }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== session.user.id) {
          return jsonError("Forbidden", 403);
        }

        const tarballKeys = await getTarballKeysForSkill(db, result.skill.id);
        for (const key of tarballKeys) {
          await env.SKILLS_BUCKET.delete(key);
        }

        await deleteSkill(db, result.skill.id);

        return Response.json({ ok: true });
      },
    },
  },
});
