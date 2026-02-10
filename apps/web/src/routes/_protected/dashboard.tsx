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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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

  const user = session?.user;

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-border/50 px-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
            SK
          </div>
          <span className="text-sm font-semibold tracking-wide">SKVault</span>
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
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
      <aside className="hidden w-56 shrink-0 border-r border-border/50 lg:block">
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
        <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 size-8 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <Avatar className="size-7 border border-border/50">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? ""} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-medium text-primary">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[13px] text-muted-foreground">
              {(user as Record<string, unknown> | undefined)?.username as string ?? user?.name}
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="relative flex-1 overflow-auto">
          <div className="dot-grid absolute inset-0" />
          <div className="relative z-10 p-4 lg:p-8">
            <div className="mx-auto max-w-5xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
