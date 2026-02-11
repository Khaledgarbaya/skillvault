import { createMiddleware } from "@tanstack/react-start";
import { logger } from "~/lib/logger";

/**
 * Wide event logging middleware for API routes.
 *
 * Emits a single structured JSON log line per request containing:
 * - Timing (duration_ms)
 * - Request metadata (method, path, query, user_agent)
 * - Auth type detection (session vs token)
 * - Response status + error details for 4xx/5xx
 * - Request ID for tracing across services
 *
 * Apply to API routes via: server.middleware: [loggingMiddleware]
 */
export const loggingMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const start = Date.now();
    const url = new URL(request.url);

    const event: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: url.pathname,
      query: url.search || undefined,
      request_id:
        request.headers.get("x-request-id") ?? crypto.randomUUID(),
      user_agent: request.headers.get("user-agent") ?? undefined,
    };

    // Detect auth type from headers
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      event.auth_type = "token";
    } else if (request.headers.get("cookie")?.includes("better-auth")) {
      event.auth_type = "session";
    }

    const requestLogger = {
      info: (data: Record<string, unknown>) => logger.info({ ...event, ...data }),
      error: (data: Record<string, unknown>) => logger.error({ ...event, ...data }),
    };

    try {
      const result = await next({ context: { logger: requestLogger } });

      // Server functions don't return { response } — only API route handlers do
      if (result?.response instanceof Response) {
        event.status_code = result.response.status;
        event.outcome =
          result.response.status < 400 ? "success" : "client_error";

        // For error responses, extract error code from body
        if (result.response.status >= 400) {
          try {
            const cloned = result.response.clone();
            const body = (await cloned.json()) as {
              error?: string;
              code?: string;
            };
            if (body.error) event.error_message = body.error;
            if (body.code) event.error_code = body.code;
          } catch {
            // non-JSON error response
          }
        }
      } else {
        event.outcome = "success";
      }

      return result;
    } catch (thrown) {
      // Auth middleware throws Response objects for 401/403
      if (thrown instanceof Response) {
        event.status_code = thrown.status;
        event.outcome = "client_error";

        try {
          const cloned = thrown.clone();
          const body = (await cloned.json()) as {
            error?: string;
            code?: string;
          };
          if (body.error) event.error_message = body.error;
          if (body.code) event.error_code = body.code;
        } catch {
          // non-JSON thrown response
        }

        throw thrown;
      }

      // Unhandled server error
      event.status_code = 500;
      event.outcome = "server_error";
      if (thrown instanceof Error) {
        event.error_message = thrown.message;
        event.error_type = thrown.name;
      }

      logger.error({ ...event, duration_ms: Date.now() - start });
      throw thrown;
    } finally {
      event.duration_ms = Date.now() - start;
      if (event.outcome !== "server_error") {
        logger.info(event);
      }
    }
  },
);
