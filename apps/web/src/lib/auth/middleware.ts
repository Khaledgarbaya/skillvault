import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { env } from "cloudflare:workers";
import { setCookie } from "@tanstack/react-start/server";
import { auth, type Session } from "./server";
import { apiTokens } from "../db/schema";
import type * as schema from "../db/schema";

export async function requireAuth(request: Request): Promise<Session> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function optionalAuth(
  request: Request,
): Promise<Session | null> {
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
    secure: env.APP_URL?.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireToken(
  request: Request,
  db: DrizzleD1Database<typeof schema>,
) {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const raw = header.slice(7);
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const [token] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.tokenHash, tokenHash))
    .limit(1);

  if (!token) {
    throw new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (token.expiresAt && token.expiresAt < new Date()) {
    throw new Response(JSON.stringify({ error: "Token expired" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiTokens.id, token.id));

  return token;
}
