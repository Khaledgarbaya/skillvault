import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Book, Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";

const sections = [
  { to: "/docs/getting-started", label: "Getting Started" },
  { to: "/docs/publishing", label: "Publishing" },
  { to: "/docs/installing", label: "Installing" },
  { to: "/docs/private-skills", label: "Private Skills" },
  { to: "/docs/scanning", label: "Scanning" },
  { to: "/docs/skillfile-reference", label: "Skillfile Reference" },
  { to: "/docs/cli-reference", label: "CLI Reference" },
] as const;

export const Route = createFileRoute("/docs")({
  component: DocsLayout,
});

function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative">
      <div className="dot-grid absolute inset-0" />
      <div className="relative z-10 mx-auto flex max-w-6xl gap-0 px-6 py-10">
        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-6 right-6 z-50 size-10 rounded-full border border-border/50 bg-background shadow-lg md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </Button>

        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "fixed inset-0 z-40 flex bg-background/95 backdrop-blur-sm md:static md:bg-transparent md:backdrop-blur-none" : "hidden md:block"} w-[220px] shrink-0`}>
          <nav className={`${sidebarOpen ? "w-[220px] border-r border-border/50 p-6" : ""} sticky top-24 space-y-1`}>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Book className="size-3.5 text-primary" />
              Documentation
            </div>
            {sections.map((section) => (
              <Link
                key={section.to}
                to={section.to}
                onClick={() => setSidebarOpen(false)}
                className="block rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{
                  className: "block rounded-md px-3 py-1.5 text-[13px] bg-primary/10 text-primary font-medium",
                }}
              >
                {section.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 pl-0 md:pl-10">
          <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-code:rounded prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-card/50">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
