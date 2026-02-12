import { createFileRoute } from "@tanstack/react-router";
import { drizzle } from "drizzle-orm/d1";
import { getSkillByOwnerAndName, getLatestVersion, getScanForVersion } from "~/lib/db/queries";
import { renderBadge } from "~/lib/badge";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  optionalScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

const BADGE_TTL = 300; // 5 minutes

export const Route = createFileRoute("/api/v1/skills/$owner/$name/badge")({
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
        const cacheKey = `badge:${params.owner}/${params.name}`;

        // Check KV cache first
        const cached = await context.cloudflare.env.CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            headers: {
              "Content-Type": "image/svg+xml",
              "Cache-Control": `public, max-age=${BADGE_TTL}`,
            },
          });
        }

        const result = await getSkillByOwnerAndName(db, params.owner, params.name);
        if (!result) {
          return new Response(renderBadge(null), {
            status: 404,
            headers: { "Content-Type": "image/svg+xml" },
          });
        }

        const { skill } = result;

        // Private skills: only show badge to authenticated owner
        if (skill.visibility === "private") {
          const authResult = await optionalScopeFromRequest(request, "read");
          if (!authResult || authResult.userId !== skill.ownerId) {
            return new Response(renderBadge(null), {
              status: 404,
              headers: { "Content-Type": "image/svg+xml" },
            });
          }
          // Don't cache private badges
          const latestVersion = await getLatestVersion(db, skill.id);
          const scan = latestVersion ? await getScanForVersion(db, latestVersion.id) : null;
          const status = (scan?.overallStatus as "pass" | "warn" | "fail") ?? null;

          return new Response(renderBadge(status), {
            headers: { "Content-Type": "image/svg+xml" },
          });
        }

        // Public skill: generate badge and cache
        const latestVersion = await getLatestVersion(db, skill.id);
        const scan = latestVersion ? await getScanForVersion(db, latestVersion.id) : null;
        const status = (scan?.overallStatus as "pass" | "warn" | "fail") ?? null;
        const svg = renderBadge(status);

        await context.cloudflare.env.CACHE.put(cacheKey, svg, { expirationTtl: BADGE_TTL });

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": `public, max-age=${BADGE_TTL}`,
          },
        });
      },
    },
  },
});
