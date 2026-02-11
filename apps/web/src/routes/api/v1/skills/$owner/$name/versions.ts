import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { jsonError } from "~/lib/api/response";
import { getSkillByOwnerAndName, getVersions } from "~/lib/db/queries";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/skills/$owner/$name/versions")({
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

        const { skill } = result;

        if (skill.visibility === "private") {
          if (!authResult || authResult.userId !== skill.ownerId) {
            return jsonError("Skill not found", 404);
          }
        }

        const versions = await getVersions(db, skill.id);

        return Response.json(versions);
      },
    },
  },
});
