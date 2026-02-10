import {
  createFileRoute,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { signOut, useSession } from "~/lib/auth/client";

export const Route = createFileRoute("/_protected/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold">SKVault</span>
          <div className="flex items-center gap-3">
            {session?.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="size-8 rounded-full"
              />
            )}
            <span className="text-sm">
              {session?.user.username ?? session?.user.name}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
