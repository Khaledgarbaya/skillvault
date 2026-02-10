import { createFileRoute } from "@tanstack/react-router";
import { requireAuth } from "~/lib/auth/middleware";

export const Route = createFileRoute("/api/v1/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const session = await requireAuth(request);
        return Response.json({
          id: session.user.id,
          email: session.user.email,
          username: session.user.username,
          displayName: session.user.name,
          avatarUrl: session.user.image,
          emailVerified: session.user.emailVerified,
        });
      },
    },
  },
});
