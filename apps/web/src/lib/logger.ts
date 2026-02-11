/**
 * Wide event logger for SKVault API.
 *
 * Accumulates context throughout a request lifecycle, then flush() emits
 * a single JSON line (canonical log line / wide event pattern).
 *
 * Usage:
 *   const logger = new Logger();
 *   logger.initFromRequest(request);
 *   logger.setUser({ id, email, username });
 *   logger.setOutcome("success", 200);
 *   const event = logger.flush("info");
 */

type LogLevel = "info" | "error";

export type WideEvent = Record<string, unknown>;

interface SamplingConfig {
  /** Fraction of successful requests to log (0..1). Always log errors. */
  successRate: number;
  /** Requests slower than this are always logged regardless of sampling. */
  slowThresholdMs: number;
}

const DEFAULT_SAMPLING: SamplingConfig = {
  successRate: 1.0,
  slowThresholdMs: 3000,
};

export class Logger {
  private fields: WideEvent = {};
  private startTime = 0;
  private sampling: SamplingConfig;

  constructor(sampling?: Partial<SamplingConfig>) {
    this.sampling = { ...DEFAULT_SAMPLING, ...sampling };
  }

  /** Extract request metadata and start the timer. */
  initFromRequest(request: Request): void {
    const url = new URL(request.url);
    this.startTime = Date.now();

    this.fields.timestamp = new Date().toISOString();
    this.fields.service = "skvault-web";
    this.fields.method = request.method;
    this.fields.path = url.pathname;
    this.fields.query = url.search || undefined;
    this.fields.request_id =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    this.fields.user_agent = request.headers.get("user-agent") ?? undefined;

    // Cloudflare headers
    this.fields.cf_ray = request.headers.get("cf-ray") ?? undefined;
    this.fields.cf_country =
      request.headers.get("cf-ipcountry") ?? undefined;

    // Detect auth type
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      this.fields.auth_type = "token";
    } else if (request.headers.get("cookie")?.includes("better-auth")) {
      this.fields.auth_type = "session";
    }
  }

  /** Enrich with user identity after auth resolves. */
  setUser(user: { id: string; email?: string; username?: string }): void {
    this.fields.user_id = user.id;
    if (user.email) this.fields.user_email = user.email;
    if (user.username) this.fields.user_username = user.username;
  }

  /** Categorize the operation (e.g. "publishSkill", "mutation"). */
  setOperation(name: string, type?: string): void {
    this.fields.operation = name;
    if (type) this.fields.operation_type = type;
  }

  /** Merge domain-specific fields (skill_name, version_tag, token_id, etc.). */
  setBusinessContext(ctx: Record<string, unknown>): void {
    Object.assign(this.fields, ctx);
  }

  /** Set request outcome. */
  setOutcome(
    outcome: "success" | "client_error" | "server_error",
    statusCode?: number,
  ): void {
    this.fields.outcome = outcome;
    if (statusCode !== undefined) this.fields.status_code = statusCode;
  }

  /** Extract error details from an Error or Response. */
  setError(error: unknown): void {
    if (error instanceof Error) {
      this.fields.error_message = error.message;
      this.fields.error_type = error.name;
    } else if (error instanceof Response) {
      this.fields.status_code = error.status;
    }
  }

  /** Set an arbitrary field. */
  set(key: string, value: unknown): void {
    this.fields[key] = value;
  }

  /** Read the current outcome (for middleware branching). */
  getOutcome(): string | undefined {
    return this.fields.outcome as string | undefined;
  }

  /**
   * Backward-compatible: merge data into fields.
   * Satisfies the RequestLogger interface shape.
   */
  info(data: Record<string, unknown>): void {
    Object.assign(this.fields, data);
  }

  /**
   * Backward-compatible: merge data into fields.
   * Satisfies the RequestLogger interface shape.
   */
  error(data: Record<string, unknown>): void {
    Object.assign(this.fields, data);
  }

  /**
   * Compute duration, apply sampling, emit JSON line.
   * Returns the full event object (for PostHog capture).
   */
  flush(level?: LogLevel): WideEvent {
    const resolvedLevel = level ?? (this.fields.outcome === "server_error" ? "error" : "info");
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

    return event;
  }
}

export function createLogger(sampling?: Partial<SamplingConfig>): Logger {
  return new Logger(sampling);
}
