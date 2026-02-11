import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "~/lib/auth/server";
import { jsonError } from "~/lib/api/response";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/auth/tokens")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      GET: async ({ request, context }: { request: Request; context: LoggedContext }) => {
        await requireScopeFromRequest(request, "read");

        const auth = createAuth(context.cloudflare.env);
        const keys = await auth.api.listApiKeys({
          headers: request.headers,
        });

        return Response.json(
          (keys as any[]).map((key) => ({
            id: key.id,
            name: key.name ?? "Unnamed",
            scopes: formatPermissions(key.permissions),
            lastUsedAt: key.lastRequest ?? null,
            expiresAt: key.expiresAt ?? null,
            createdAt: key.createdAt,
          })),
        );
      },

      POST: async ({ request, context }: { request: Request; context: LoggedContext }) => {
        const authResult = await requireScopeFromRequest(request, "read");

        const body = (await request.json()) as {
          name: string;
          scopes?: string;
        };

        if (!body.name) {
          return jsonError("Token name is required", 400);
        }

        const scopes = (body.scopes ?? "publish,read").split(",").map((s) => s.trim());

        const auth = createAuth(context.cloudflare.env);
        const result = await auth.api.createApiKey({
          body: {
            name: body.name,
            prefix: "sk",
            userId: authResult.userId,
            permissions: { skills: scopes },
          },
        });

        return Response.json({ token: result.key, id: result.id, name: body.name });
      },
    },
  },
});

function formatPermissions(permissions: unknown): string {
  if (!permissions || typeof permissions !== "object") return "publish,read";
  const perms = permissions as Record<string, string[]>;
  const skillsPerms = perms.skills;
  if (Array.isArray(skillsPerms)) return skillsPerms.join(",");
  return "publish,read";
}
