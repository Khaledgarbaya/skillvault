import { createMiddleware } from "@tanstack/react-start";
import { auth } from "~/lib/auth/server";
import { jsonError } from "~/lib/api/response";
import type { Logger } from "~/lib/logger";

function getLogger(context: unknown): Logger | undefined {
  return (context as { logger?: Logger }).logger;
}

function enrichLogger(
  context: unknown,
  user: { id: string; email?: string; username?: string },
) {
  const logger = getLogger(context);
  if (logger) {
    logger.setUser(user);
  }
}

/**
 * Session-only auth middleware (dashboard server functions).
 * Supports cookies and Bearer session tokens via the bearer() plugin.
 */
export const authMiddleware = createMiddleware().server(
  async ({ request, next, context }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      throw new Error("Unauthorized");
    }

    enrichLogger(context, {
      id: session.user.id,
      email: session.user.email,
      username: (session.user as { username?: string }).username ?? undefined,
    });

    return next({ context: { session } });
  },
);

/**
 * Extract a Bearer token from the Authorization header.
 */
function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/**
 * Middleware factory: require session OR API key with a specific permission.
 * Use for protected server functions (publish, read, etc.).
 */
export function requireScope(scope: string) {
  return createMiddleware().server(
    async ({ request, next, context }) => {
      // 1. Try session auth (cookie or Bearer session token)
      const session = await auth.api.getSession({ headers: request.headers });
      if (session) {
        enrichLogger(context, {
          id: session.user.id,
          email: session.user.email,
          username: (session.user as { username?: string }).username ?? undefined,
        });
        return next({
          context: { userId: session.user.id, authType: "session" as const },
        });
      }

      // 2. Try API key (x-api-key header or Authorization: Bearer)
      const apiKeyValue =
        request.headers.get("x-api-key") ?? extractBearerToken(request);
      if (apiKeyValue) {
        const result = await auth.api.verifyApiKey({
          body: {
            key: apiKeyValue,
            permissions: { skills: [scope] },
          },
        });
        if (result.valid && result.key) {
          enrichLogger(context, { id: result.key.userId });
          const logger = getLogger(context);
          if (logger) {
            logger.set("auth_type", "api_key");
          }
          return next({
            context: {
              userId: result.key.userId,
              authType: "api_key" as const,
            },
          });
        }
      }

      throw jsonError("Unauthorized", 401, { code: "UNAUTHORIZED" });
    },
  );
}

// ─── Inline helpers for API route handlers ───────────────────────
// Use these in route handlers where per-method middleware isn't possible.

export type AuthResult = {
  userId: string;
  authType: "session" | "api_key";
};

/**
 * Require session or API key with a specific scope. Throws 401 Response.
 * Use in API route handlers where per-method middleware isn't available.
 */
export async function requireScopeFromRequest(
  request: Request,
  scope: string,
): Promise<AuthResult> {
  // 1. Try session auth
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) {
    return { userId: session.user.id, authType: "session" };
  }

  // 2. Try API key
  const apiKeyValue =
    request.headers.get("x-api-key") ?? extractBearerToken(request);
  if (apiKeyValue) {
    const result = await auth.api.verifyApiKey({
      body: { key: apiKeyValue, permissions: { skills: [scope] } },
    });
    if (result.valid && result.key) {
      return { userId: result.key.userId, authType: "api_key" };
    }
  }

  throw jsonError("Unauthorized", 401, { code: "UNAUTHORIZED" });
}

/**
 * Optional session or API key auth. Returns null if unauthenticated.
 * Use in API route handlers for public endpoints with optional auth.
 */
export async function optionalScopeFromRequest(
  request: Request,
  scope: string,
): Promise<AuthResult | null> {
  // 1. Try session auth
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) {
    return { userId: session.user.id, authType: "session" };
  }

  // 2. Try API key
  const apiKeyValue =
    request.headers.get("x-api-key") ?? extractBearerToken(request);
  if (apiKeyValue) {
    try {
      const result = await auth.api.verifyApiKey({
        body: { key: apiKeyValue, permissions: { skills: [scope] } },
      });
      if (result.valid && result.key) {
        return { userId: result.key.userId, authType: "api_key" };
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Middleware factory: optional session OR API key auth.
 * Use for public server functions that behave differently for authenticated users.
 */
export function optionalScope(scope: string) {
  return createMiddleware().server(
    async ({ request, next, context }) => {
      // 1. Try session auth
      const session = await auth.api.getSession({ headers: request.headers });
      if (session) {
        enrichLogger(context, {
          id: session.user.id,
          email: session.user.email,
          username: (session.user as { username?: string }).username ?? undefined,
        });
        return next({
          context: { userId: session.user.id, authType: "session" as const },
        });
      }

      // 2. Try API key
      const apiKeyValue =
        request.headers.get("x-api-key") ?? extractBearerToken(request);
      if (apiKeyValue) {
        const result = await auth.api.verifyApiKey({
          body: {
            key: apiKeyValue,
            permissions: { skills: [scope] },
          },
        });
        if (result.valid && result.key) {
          enrichLogger(context, { id: result.key.userId });
          const logger = getLogger(context);
          if (logger) {
            logger.set("auth_type", "api_key");
          }
          return next({
            context: {
              userId: result.key.userId,
              authType: "api_key" as const,
            },
          });
        }
      }

      // 3. No auth — continue with null context
      return next({
        context: { userId: null, authType: null },
      });
    },
  );
}
