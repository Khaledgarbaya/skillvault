import type { Session } from "~/lib/auth/server";
import type { Logger } from "~/lib/logger";

export interface CloudflareEnv {
  DB: D1Database;
  SKILLS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  APP_URL: string;
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

export interface LoggingContext {
  logger: Logger;
}

export type LoggedAuthContext = CloudflareContext & AuthContext & LoggingContext;
export type LoggedContext = CloudflareContext & LoggingContext;
