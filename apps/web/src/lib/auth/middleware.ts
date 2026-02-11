import { setCookie } from "@tanstack/react-start/server";
import { createAuth, type Session } from "./server";
import { jsonError } from "../api/response";
import type { CloudflareEnv } from "~/lib/middleware/types";

export async function requireAuth(request: Request, env: CloudflareEnv): Promise<Session> {
  const auth = createAuth(env);
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    throw jsonError("Unauthorized", 401, { code: "UNAUTHORIZED" });
  }
  return session;
}

export async function optionalAuth(
  request: Request,
  env: CloudflareEnv,
): Promise<Session | null> {
  const auth = createAuth(env);
  return auth.api.getSession({ headers: request.headers });
}

/**
 * Invalidate better-auth's session cookie cache. Call this after any
 * server-side mutation that changes user profile fields (username, avatar,
 * displayName, etc.) to prevent stale cached data from causing redirect
 * loops or showing outdated values.
 */
export function invalidateSessionCache() {
  setCookie("better-auth.session_data", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
