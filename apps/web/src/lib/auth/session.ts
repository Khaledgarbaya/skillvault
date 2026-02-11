import { createServerFn } from "@tanstack/react-start";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const { auth } = await import("~/lib/auth/server");
    const session = await auth.api.getSession({
      headers: request!.headers,
    });
    return session;
  },
);
