---
name: wide-event-logging
description: "Implement canonical log lines / wide events pattern — one structured JSON line per request with full context, sampling, and observability integration"
version: 1.0.0
---

# Wide Event Logging (Canonical Log Lines)

Implement the wide events / canonical log lines pattern for structured observability. Instead of scattered `console.log` calls, accumulate one rich event per request and flush a single JSON line at the end.

## Why Wide Events

Traditional logging scatters context across many lines:

```
[INFO] Request received: POST /api/skills/publish
[INFO] User authenticated: usr_abc123
[INFO] Skill validated: my-skill v1.0.0
[INFO] Upload complete: 142ms
```

Wide events consolidate everything into one searchable line:

```json
{
  "level": "info",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "service": "my-api",
  "request_id": "a1b2c3d4",
  "method": "POST",
  "path": "/api/skills/publish",
  "user_id": "usr_abc123",
  "user_username": "alice",
  "auth_type": "token",
  "outcome": "success",
  "status_code": 201,
  "duration_ms": 142
}
```

Benefits:
- **One line = one request** — no log correlation needed
- **High cardinality** — request IDs, user IDs, business fields are all searchable
- **Structured JSON** — parseable by any log aggregator (Datadog, Grafana, PostHog)
- **Sampling-friendly** — you can drop successful requests but always keep errors

## Logger Class Implementation

```typescript
type LogLevel = "info" | "error";
type WideEvent = Record<string, unknown>;

interface SamplingConfig {
  successRate: number;      // 0..1, fraction of successes to emit
  slowThresholdMs: number;  // always log requests slower than this
}

export class Logger {
  private fields: WideEvent = {};
  private startTime = 0;
  private sampling: SamplingConfig;

  constructor(sampling?: Partial<SamplingConfig>) {
    this.sampling = {
      successRate: 1.0,       // log everything initially
      slowThresholdMs: 3000,  // always log slow requests
      ...sampling,
    };
  }

  /** Extract request metadata and start the timer. */
  initFromRequest(request: Request): void {
    const url = new URL(request.url);
    this.startTime = Date.now();
    this.fields.timestamp = new Date().toISOString();
    this.fields.service = "my-api";
    this.fields.method = request.method;
    this.fields.path = url.pathname;
    this.fields.query = url.search || undefined;
    this.fields.request_id =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    this.fields.user_agent =
      request.headers.get("user-agent") ?? undefined;
  }

  /** Enrich with user identity after auth resolves. */
  setUser(user: { id: string; email?: string }): void {
    this.fields.user_id = user.id;
    if (user.email) this.fields.user_email = user.email;
  }

  /** Set request outcome. */
  setOutcome(
    outcome: "success" | "client_error" | "server_error",
    statusCode?: number,
  ): void {
    this.fields.outcome = outcome;
    if (statusCode !== undefined) this.fields.status_code = statusCode;
  }

  /** Extract error details. */
  setError(error: unknown): void {
    if (error instanceof Error) {
      this.fields.error_message = error.message;
      this.fields.error_type = error.name;
    }
  }

  /** Merge domain-specific fields. */
  setBusinessContext(ctx: Record<string, unknown>): void {
    Object.assign(this.fields, ctx);
  }

  /** Set an arbitrary field. */
  set(key: string, value: unknown): void {
    this.fields[key] = value;
  }

  /** Compute duration, apply sampling, emit JSON line. */
  flush(level?: LogLevel): WideEvent {
    const resolvedLevel =
      level ?? (this.fields.outcome === "server_error" ? "error" : "info");
    const durationMs = this.startTime ? Date.now() - this.startTime : 0;
    this.fields.duration_ms = durationMs;

    const event: WideEvent = { level: resolvedLevel, ...this.fields };

    // Always log errors and slow requests; sample successes
    const shouldEmit =
      resolvedLevel === "error" ||
      durationMs >= this.sampling.slowThresholdMs ||
      Math.random() < this.sampling.successRate;

    if (shouldEmit) {
      const line = JSON.stringify(event);
      if (resolvedLevel === "error") {
        console.error(line);
      } else {
        console.log(line);
      }
    }

    return event; // always return for downstream consumers (PostHog, etc.)
  }
}
```

## Middleware Integration

The Logger is created in logging middleware, accumulated through the request, and flushed in `finally`:

```typescript
export const loggingMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const logger = new Logger();
    logger.initFromRequest(request);

    try {
      const result = await next({ context: { logger } });

      if (result?.response instanceof Response) {
        const status = result.response.status;
        logger.setOutcome(
          status < 400 ? "success" : "client_error",
          status,
        );
      } else {
        logger.setOutcome("success");
      }

      return result;
    } catch (thrown) {
      if (thrown instanceof Response) {
        logger.setOutcome("client_error", thrown.status);
        throw thrown;
      }

      logger.setOutcome("server_error", 500);
      logger.setError(thrown);
      throw thrown;
    } finally {
      const event = logger.flush();
      captureToAnalytics(event); // PostHog, Datadog, etc.
    }
  },
);
```

## Enrichment Points

Each middleware in the chain enriches the same Logger instance:

| Middleware | Enrichment |
|-----------|-----------|
| Logging | request metadata, timing, outcome |
| Auth | `user_id`, `user_email`, `auth_type` |
| Handler | business context (`skill_name`, `version`, etc.) |

```typescript
// In auth middleware — after session resolves
if (context.logger) {
  context.logger.setUser({
    id: session.user.id,
    email: session.user.email,
  });
}

// In handler — business context
context.logger.setBusinessContext({
  skill_name: "my-skill",
  version_tag: "1.0.0",
  action: "publish",
});
```

## Sampling Strategy

Not every successful GET needs to be logged in production:

```typescript
// Development — log everything
const logger = new Logger({ successRate: 1.0 });

// Production — sample 10% of successes, always log errors + slow
const logger = new Logger({
  successRate: 0.1,
  slowThresholdMs: 3000,
});
```

Rules applied in `flush()`:
1. **Errors** — always emitted regardless of sampling
2. **Slow requests** (> `slowThresholdMs`) — always emitted
3. **Successes** — emitted with probability `successRate`

## Analytics Integration

The `flush()` method returns the full event object so the middleware can forward it:

```typescript
function captureToPostHog(event: WideEvent, env: Env): void {
  const { POSTHOG_KEY, POSTHOG_HOST } = env;
  if (!POSTHOG_KEY || !POSTHOG_HOST) return;

  // Prefer user_id for proper user attribution
  const distinctId = (event.user_id as string) ?? (event.request_id as string);

  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: event.outcome === "server_error" ? "server_error" : "api_request",
      distinct_id: distinctId,
      properties: { ...event, $lib: "my-server" },
    }),
  }).catch(() => {}); // fire-and-forget
}
```

## Key Principles

1. **One event per request** — never scatter logs across the lifecycle
2. **Accumulate, don't emit** — `set()` / `setUser()` / `setOutcome()` build up; only `flush()` writes
3. **High cardinality is good** — request IDs, user IDs, skill names are all searchable dimensions
4. **Two levels only** — `info` (normal flow) and `error` (unhandled exceptions). No debug/warn/trace.
5. **Side effects stay in middleware** — the Logger class is pure accumulation; PostHog/Datadog capture happens in the middleware's `finally` block
6. **Return the event** — `flush()` returns the object for downstream consumers, even if sampling dropped the console output
