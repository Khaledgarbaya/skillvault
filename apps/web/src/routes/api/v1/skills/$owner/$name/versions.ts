import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { optionalAuth } from "~/lib/auth/middleware";
import { jsonError } from "~/lib/api/response";
import { getSkillByOwnerAndName, getVersions } from "~/lib/db/queries";

export const Route = createFileRoute("/api/v1/skills/$owner/$name/versions")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { owner: string; name: string } }) => {
        const db = drizzle(env.DB);
        const session = await optionalAuth(request);

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        const { skill } = result;

        if (skill.visibility === "private") {
          if (!session || session.user.id !== skill.ownerId) {
            return jsonError("Skill not found", 404);
          }
        }

        const versions = await getVersions(db, skill.id);

        return Response.json(versions);
      },
    },
  },
});
