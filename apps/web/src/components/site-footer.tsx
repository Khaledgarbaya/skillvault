export function SiteFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img
              src="/skvault-logo.svg"
              alt="skscan"
              className="size-5 rounded-md"
            />
            <span className="font-mono text-[11px] text-muted-foreground">
              Security scanner for AI agent skills
            </span>
          </div>
          <div className="flex items-center gap-5 font-mono text-[11px] text-muted-foreground">
            <a
              href="https://github.com/Khaledgarbaya/skillvault"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <a
              href="https://github.com/Khaledgarbaya/skillvault#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Docs
            </a>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-border/30 pt-6 sm:flex-row">
          <span className="text-[11px] text-muted-foreground/50">
            Made by Khaled Garbaya
          </span>
          <span className="text-[11px] text-muted-foreground/40">
            &copy; {new Date().getFullYear()} skscan &middot; MIT License
          </span>
        </div>
      </div>
    </footer>
  );
}
