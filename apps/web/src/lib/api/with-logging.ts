import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { Logger } from "~/lib/logger";
import type { WideEvent } from "~/lib/logger";
import type { CloudflareEnv } from "~/lib/middleware/types";

/**
 * Send a wide event to PostHog as a server-side capture.
 * Fire-and-forget — failures are silently ignored.
 */
function captureToPostHog(
  event: WideEvent,
  phEnv: Pick<CloudflareEnv, "VITE_PUBLIC_POSTHOG_KEY" | "VITE_PUBLIC_POSTHOG_HOST">,
): void {
  const { VITE_PUBLIC_POSTHOG_KEY: phKey, VITE_PUBLIC_POSTHOG_HOST: phHost } = phEnv;
  if (!phKey || !phHost) return;

  const distinctId = (event.user_id as string) ?? (event.request_id as string);

  fetch(`${phHost}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: phKey,
      event: event.outcome === "server_error" ? "server_error" : "api_request",
      distinct_id: distinctId,
      properties: { ...event, $lib: "skvault-server" },
    }),
  }).catch(() => {});
}

/**
 * Wide event logging middleware for API routes.
 *
 * Creates a Logger instance that accumulates context through the request
 * lifecycle (auth, handler, error), then flushes a single JSON line +
 * PostHog capture in the finally block.
 */
export const loggingMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const logger = new Logger();
    logger.initFromRequest(request);

    try {
      const result = await next({ context: { logger } });

      // Server functions don't return { response } — only API route handlers do
      if (result?.response instanceof Response) {
        const status = result.response.status;
        logger.setOutcome(status < 400 ? "success" : "client_error", status);

        // Extract error details from 4xx/5xx response bodies
        if (status >= 400) {
          try {
            const cloned = result.response.clone();
            const body = (await cloned.json()) as {
              error?: string;
              code?: string;
            };
            if (body.error) logger.set("error_message", body.error);
            if (body.code) logger.set("error_code", body.code);
          } catch {
            // non-JSON error response
          }
        }
      } else {
        logger.setOutcome("success");
      }

      return result;
    } catch (thrown) {
      // Auth middleware throws Response objects for 401/403
      if (thrown instanceof Response) {
        logger.setOutcome("client_error", thrown.status);

        try {
          const cloned = thrown.clone();
          const body = (await cloned.json()) as {
            error?: string;
            code?: string;
          };
          if (body.error) logger.set("error_message", body.error);
          if (body.code) logger.set("error_code", body.code);
        } catch {
          // non-JSON thrown response
        }

        throw thrown;
      }

      // Unhandled server error
      logger.setOutcome("server_error", 500);
      logger.setError(thrown);

      throw thrown;
    } finally {
      const event = logger.flush();
      captureToPostHog(event, env);
    }
  },
);
