import { createFileRoute } from "@tanstack/react-router";
import { scanSkill } from "@skvault/scanner";
import type { SkillFile, ScanConfig } from "@skvault/scanner";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { scanRecords } from "~/lib/db/schema";
import { jsonError } from "~/lib/api/response";
import type { CloudflareEnv } from "~/lib/middleware/types";

const MAX_FILES = 100;
const MAX_TOTAL_SIZE = 1_048_576; // 1MB

export const Route = createFileRoute("/api/v1/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cfEnv = env as unknown as CloudflareEnv;

        // ── Rate limiting ──────────────────────────────────────────
        const ip =
          request.headers.get("cf-connecting-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "unknown";
        const rateLimitKey = `ratelimit:${ip}`;

        try {
          const current = await cfEnv.BADGE_CACHE.get(rateLimitKey);
          const count = current ? parseInt(current, 10) : 0;

          if (count >= 60) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. 60 requests/hour." }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": "3600",
                },
              },
            );
          }

          // Increment (fire-and-forget, don't block the scan)
          cfEnv.BADGE_CACHE.put(rateLimitKey, String(count + 1), {
            expirationTtl: 3600,
          });
        } catch {
          // KV failure shouldn't block scanning
        }

        // ── Parse & validate request ───────────────────────────────
        let body: { files?: unknown; config?: unknown };
        try {
          body = await request.json();
        } catch {
          return jsonError("Invalid JSON body", 400);
        }

        if (!body.files || !Array.isArray(body.files)) {
          return jsonError("'files' must be a non-empty array", 400);
        }

        if (body.files.length === 0) {
          return jsonError("'files' must be a non-empty array", 400);
        }

        if (body.files.length > MAX_FILES) {
          return jsonError(`Maximum ${MAX_FILES} files allowed`, 400);
        }

        // Validate file structure and total size
        let totalSize = 0;
        const files: SkillFile[] = [];

        for (const f of body.files) {
          if (
            !f ||
            typeof f !== "object" ||
            typeof f.path !== "string" ||
            typeof f.content !== "string"
          ) {
            return jsonError(
              "Each file must have 'path' (string) and 'content' (string)",
              400,
            );
          }
          totalSize += f.content.length;
          if (totalSize > MAX_TOTAL_SIZE) {
            return jsonError("Total content size exceeds 1MB limit", 400);
          }
          files.push({ path: f.path, content: f.content });
        }

        const config = (body.config as ScanConfig) ?? undefined;

        // ── Run scan ───────────────────────────────────────────────
        const result = scanSkill(files, config);

        // ── Optionally store in D1 ─────────────────────────────────
        const provider = request.headers.get("x-repo-provider");
        const owner = request.headers.get("x-repo-owner");
        const repo = request.headers.get("x-repo-name");
        const ref = request.headers.get("x-repo-ref");

        if (provider && owner && repo) {
          try {
            const db = drizzle(cfEnv.DB);
            await db.insert(scanRecords).values({
              id: crypto.randomUUID(),
              provider,
              owner,
              repo,
              ref: ref ?? null,
              status: result.status,
              findingsCount: result.summary.total,
              criticalCount: result.summary.critical,
              highCount: result.summary.high,
              mediumCount: result.summary.medium,
              lowCount: result.summary.low,
              findings: JSON.stringify(result.findings),
              scanDuration: result.scanDuration,
              engineVersion: result.engineVersion,
            });
          } catch {
            // D1 insert failure shouldn't break the scan response
          }
        }

        return Response.json(result);
      },
    },
  },
});
