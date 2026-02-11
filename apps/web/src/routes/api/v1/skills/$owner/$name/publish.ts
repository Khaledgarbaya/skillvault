import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { validateVersion, MAX_TARBALL_SIZE } from "@skvault/shared";
import { requireAuth } from "~/lib/auth/middleware";
import { jsonError } from "~/lib/api/response";
import { getSkillByOwnerAndName } from "~/lib/db/queries";
import { publishSkillVersion, PublishError } from "~/lib/publish";

export const Route = createFileRoute("/api/v1/skills/$owner/$name/publish")({
  server: {
    handlers: {
      POST: async ({
        request,
        params,
      }: {
        request: Request;
        params: { owner: string; name: string };
      }) => {
        const session = await requireAuth(request);
        const db = drizzle(env.DB);

        // Resolve skill + verify ownership
        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return jsonError("Skill not found", 404);
        }

        if (result.skill.ownerId !== session.user.id) {
          return jsonError("Forbidden", 403);
        }

        // Parse multipart form
        const contentType = request.headers.get("Content-Type") ?? "";
        if (!contentType.includes("multipart/form-data")) {
          return jsonError("Content-Type must be multipart/form-data", 400);
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return jsonError("Invalid multipart form data", 400);
        }

        // Extract version string
        const version = formData.get("version");
        if (!version || typeof version !== "string") {
          return jsonError("Missing 'version' field", 400);
        }

        const versionCheck = validateVersion(version);
        if (!versionCheck.valid) {
          return jsonError(versionCheck.error!, 400);
        }

        // Extract tarball file
        const tarball = formData.get("tarball");
        if (!tarball || !(tarball instanceof File)) {
          return jsonError("Missing 'tarball' file", 400);
        }

        if (tarball.size > MAX_TARBALL_SIZE) {
          return jsonError(
            `Tarball exceeds maximum size of ${MAX_TARBALL_SIZE / (1024 * 1024)}MB`,
            413,
          );
        }

        const buffer = await tarball.arrayBuffer();

        // Publish
        try {
          const published = await publishSkillVersion({
            db,
            bucket: env.SKILLS_BUCKET,
            skillId: result.skill.id,
            publishedBy: session.user.id,
            version,
            tarball: buffer,
            filename: tarball.name,
          });

          return new Response(
            JSON.stringify({
              version: published.version,
              hash: published.contentHash,
              scan: { id: published.scanId, status: published.scanStatus },
              url: `/api/v1/skills/${params.owner}/${params.name}/${published.version}`,
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        } catch (error) {
          if (error instanceof PublishError) {
            return jsonError(error.message, error.status);
          }
          throw error;
        }
      },
    },
  },
});
