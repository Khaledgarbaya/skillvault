import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc } from "drizzle-orm";
import { scanRecords } from "~/lib/db/schema";
import { renderBadge } from "~/lib/badge";
import type { CloudflareEnv } from "~/lib/middleware/types";

const CACHE_TTL_SECONDS = 300; // 5 minutes

export const Route = createFileRoute(
  "/api/v1/badge/$provider/$owner/$repo",
)({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { provider, owner, repo } = params;
        const cfEnv = env as unknown as CloudflareEnv;
        const cacheKey = `badge:${provider}:${owner}:${repo}`;

        // ── Check KV cache ─────────────────────────────────────────
        try {
          const cached = await cfEnv.BADGE_CACHE.get(cacheKey);
          if (cached) {
            return new Response(cached, {
              headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
              },
            });
          }
        } catch {
          // KV failure — fall through to D1
        }

        // ── Query D1 for latest scan ───────────────────────────────
        let status: "pass" | "warn" | "fail" | null = null;

        try {
          const db = drizzle(cfEnv.DB);
          const rows = await db
            .select({ status: scanRecords.status })
            .from(scanRecords)
            .where(
              and(
                eq(scanRecords.provider, provider),
                eq(scanRecords.owner, owner),
                eq(scanRecords.repo, repo),
              ),
            )
            .orderBy(desc(scanRecords.createdAt))
            .limit(1);

          if (rows[0]) {
            status = rows[0].status as "pass" | "warn" | "fail";
          }
        } catch {
          // D1 failure — return unknown badge
        }

        // ── Generate & cache badge ─────────────────────────────────
        const svg = renderBadge(status);

        try {
          await cfEnv.BADGE_CACHE.put(cacheKey, svg, {
            expirationTtl: CACHE_TTL_SECONDS,
          });
        } catch {
          // Cache write failure is non-fatal
        }

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
          },
        });
      },
    },
  },
});
