import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src="/skvault-logo.svg"
            alt="skscan"
            className="size-7 rounded-md transition-opacity group-hover:opacity-80"
          />
          <span className="text-sm font-semibold tracking-wide">skscan</span>
        </Link>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/anthropics/skillvault"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
