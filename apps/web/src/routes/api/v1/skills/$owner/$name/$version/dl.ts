import { createFileRoute } from "@tanstack/react-router";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { validateVersion } from "@skvault/shared";
import { jsonError } from "~/lib/api/response";
import { skills, installEvents } from "~/lib/db/schema";
import { getSkillByOwnerAndName, getVersion } from "~/lib/db/queries";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/skills/$owner/$name/$version/dl")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string; version: string };
        context: LoggedContext;
      }) => {
        const db = drizzle(context.cloudflare.env.DB);
        const authResult = await optionalScopeFromRequest(request, "read");

        const versionCheck = validateVersion(params.version);
        if (!versionCheck.valid) {
          return jsonError(versionCheck.error!, 400);
        }

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

        const version = await getVersion(db, skill.id, params.version);
        if (!version) {
          return jsonError("Version not found", 404);
        }

        if (version.status === "yanked") {
          return jsonError("This version has been yanked", 410, version.yankReason ?? undefined);
        }

        const object = await context.cloudflare.env.SKILLS_BUCKET.get(version.tarballKey);
        if (!object) {
          return jsonError("Tarball not found", 404);
        }

        const eventId = crypto.randomUUID();
        const agentType = request.headers.get("X-Agent-Type") ?? "unknown";

        await db.batch([
          db.update(skills).set({ downloadCount: sql`${skills.downloadCount} + 1` }).where(eq(skills.id, skill.id)),
          db.insert(installEvents).values({
            id: eventId,
            skillVersionId: version.id,
            agentType,
            createdAt: new Date(),
          }),
        ]);

        const filename = `${params.owner}-${params.name}-${params.version}.tar.gz`;

        return new Response(object.body, {
          headers: {
            "Content-Type": "application/gzip",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      },
    },
  },
});
