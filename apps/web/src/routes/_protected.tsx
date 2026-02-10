import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "~/lib/auth/server";

const getSessionFn = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const session = await auth.api.getSession({
      headers: request!.headers,
    });
    return session;
  },
);

export const Route = createFileRoute("/_protected")({
  beforeLoad: async () => {
    const session = await getSessionFn();
    if (!session?.user) {
      throw redirect({ to: "/login" });
    }
    return { user: session.user, session: session.session };
  },
  component: () => <Outlet />,
});
