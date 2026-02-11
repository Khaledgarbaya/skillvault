import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { validateVersion } from "@skvault/shared";
import { jsonError } from "~/lib/api/response";
import { getSkillByOwnerAndName, getVersion, getScanForVersion, updateVersionStatus } from "~/lib/db/queries";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/skills/$owner/$name/$version")({
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

        const scan = await getScanForVersion(db, version.id);

        return Response.json({ ...version, scan });
      },

      PATCH: async ({
        request,
        params,
        context,
      }: {
        request: Request;
        params: { owner: string; name: string; version: string };
        context: LoggedContext;
      }) => {
        const authResult = await requireScopeFromRequest(request, "publish");
        const db = drizzle(context.cloudflare.env.DB);

        const versionCheck = validateVersion(params.version);
        if (!versionCheck.valid) {
          return jsonError(versionCheck.error!, 400);
        }

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== authResult.userId) {
          return jsonError("Forbidden", 403);
        }

        const version = await getVersion(db, result.skill.id, params.version);
        if (!version) {
          return jsonError("Version not found", 404);
        }

        const body = (await request.json()) as {
          status: "deprecated" | "yanked";
          deprecationMessage?: string;
          yankReason?: string;
        };

        if (body.status !== "deprecated" && body.status !== "yanked") {
          return jsonError("Status must be 'deprecated' or 'yanked'", 400);
        }

        await updateVersionStatus(db, version.id, {
          status: body.status,
          deprecationMessage: body.deprecationMessage,
          yankReason: body.yankReason,
        });

        return Response.json({ ok: true });
      },
    },
  },
});
