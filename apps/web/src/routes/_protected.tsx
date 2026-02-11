import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionFn } from "~/lib/auth/session";

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
