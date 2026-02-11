import type { Session } from "~/lib/auth/server";

export interface CloudflareEnv {
  DB: D1Database;
  SKILLS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  APP_URL: string;
}

export interface RequestLogger {
  info: (data: Record<string, unknown>) => void;
  error: (data: Record<string, unknown>) => void;
}

export interface CloudflareContext {
  cloudflare: { env: CloudflareEnv };
}

export interface AuthContext {
  session: Session;
}

export interface LoggingContext {
  logger: RequestLogger;
}

export type LoggedAuthContext = CloudflareContext & AuthContext & LoggingContext;
export type LoggedContext = CloudflareContext & LoggingContext;
