import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2.5">
              <img
                src="/skvault-logo.svg"
                alt="SKVault"
                className="size-6 rounded-md"
              />
              <span className="text-sm font-semibold tracking-wide">SKVault</span>
            </div>
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              The package manager for AI agent skills. Publish, discover, and install reusable skills with security scanning built in.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Product
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li>
                <Link to="/explore" className="text-muted-foreground transition-colors hover:text-foreground">
                  Explore
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted-foreground transition-colors hover:text-foreground">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} SKVault
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/40">
            <span className="inline-block size-1.5 rounded-full bg-primary/50" />
            <span>Systems nominal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
