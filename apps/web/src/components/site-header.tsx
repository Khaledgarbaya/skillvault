import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { signOut, useSession } from "~/lib/auth/client";

export function SiteHeader() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary transition-colors group-hover:bg-primary/20">
              SK
            </div>
            <span className="text-sm font-semibold tracking-wide">SKVault</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link
              to="/explore"
              className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Explore
            </Link>
            <a
              href="https://github.com/anthropics/skillvault"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex md:items-center md:gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative size-8 rounded-full">
                    <Avatar className="size-8 border border-border/50">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {(user.name ?? user.email ?? "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {(user as Record<string, unknown>).username as string ?? user.name}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="h-8 rounded-md bg-primary/10 px-4 text-xs font-medium text-primary hover:bg-primary/20"
                asChild
              >
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 px-6 pb-4 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              to="/explore"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Explore
            </Link>
            <a
              href="https://github.com/anthropics/skillvault"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              GitHub
            </a>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-md px-3 py-2 text-sm text-primary hover:bg-primary/10"
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
