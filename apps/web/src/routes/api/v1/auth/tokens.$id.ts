import { createFileRoute } from "@tanstack/react-router";
import { auth } from "~/lib/auth/server";
import { jsonError } from "~/lib/api/response";
import {
  loggingMiddleware,
  cloudflareMiddleware,
  requireScopeFromRequest,
} from "~/lib/middleware";
import type { LoggedContext } from "~/lib/middleware";

export const Route = createFileRoute("/api/v1/auth/tokens/$id")({
  server: {
    middleware: [loggingMiddleware, cloudflareMiddleware],
    handlers: {
      DELETE: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string };
        context: LoggedContext;
      }) => {
        await requireScopeFromRequest(request, "read");

        try {
          await auth.api.deleteApiKey({
            body: { keyId: params.id },
          });
        } catch {
          return jsonError("Token not found", 404);
        }

        return Response.json({ success: true });
      },
    },
  },
});
