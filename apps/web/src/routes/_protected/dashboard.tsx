import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Upload,
  Key,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { signOut, useSession } from "~/lib/auth/client";

export const Route = createFileRoute("/_protected/dashboard")({
  component: DashboardLayout,
});

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/skills", label: "Skills", icon: Package },
  { to: "/dashboard/skills/new", label: "Publish", icon: Upload },
  { to: "/dashboard/tokens", label: "Tokens", icon: Key },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function DashboardLayout() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  function isActive(to: string, exact?: boolean) {
    if (exact) return pathname === to;
    return pathname.startsWith(to);
  }

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border/50 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">
            SKVault
          </span>
        </Link>
      </div>
      <div className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to, "exact" in item ? item.exact : false);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-border/50 p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border/50 bg-card/30 lg:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-56 border-r border-border/50 bg-background">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center border-b border-border/50 px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            {session?.user.image && (
              <img
                src={session.user.image}
                alt=""
                className="size-7 rounded-full"
              />
            )}
            <span className="text-sm text-muted-foreground">
              {session?.user.username ?? session?.user.name}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
