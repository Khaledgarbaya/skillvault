export function SiteFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img
              src="/skvault-logo.svg"
              alt="skscan"
              className="size-5 rounded-md"
            />
            <span className="text-xs text-muted-foreground">
              Open-source security scanner for AI agent skills
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com/anthropics/skillvault"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <span className="text-muted-foreground/40">&middot;</span>
            <span className="text-muted-foreground/60">
              &copy; {new Date().getFullYear()} skscan
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
