import type { Session } from "~/lib/auth/server";
import type { Logger } from "~/lib/logger";

export interface CloudflareEnv {
  DB: D1Database;
  SKILLS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  SCAN_QUEUE: Queue;
  AI: Ai;
  APP_URL: string;
  AUTH_SECRET: string;
  RESEND_API_KEY: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  VITE_PUBLIC_POSTHOG_KEY: string;
  VITE_PUBLIC_POSTHOG_HOST: string;
}

/** @deprecated Use Logger class directly — kept for backward compatibility. */
export type RequestLogger = Logger;

export interface CloudflareContext {
  cloudflare: { env: CloudflareEnv };
}

export interface AuthContext {
  session: Session;
}

export interface ScopeAuthContext {
  userId: string;
  authType: "session" | "api_key";
}

export interface OptionalScopeAuthContext {
  userId: string | null;
  authType: "session" | "api_key" | null;
}

export interface LoggingContext {
  logger: Logger;
}

export type LoggedAuthContext = CloudflareContext & AuthContext & LoggingContext;
export type LoggedScopeContext = CloudflareContext & ScopeAuthContext & LoggingContext;
export type LoggedOptionalScopeContext = CloudflareContext & OptionalScopeAuthContext & LoggingContext;
export type LoggedContext = CloudflareContext & LoggingContext;
