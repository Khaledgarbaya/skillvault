import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const features = [
  {
    title: "Semantic Versioning",
    description:
      "Publish immutable versions with semver. Agents pin exact versions or ranges for reproducible behavior.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Security Scanning",
    description:
      "Every published version is scanned for secrets, unsafe permissions, network access, and filesystem risks.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </svg>
    ),
  },
  {
    title: "Private Registries",
    description:
      "Host private skills for your team. Control visibility and access with API tokens and scoped permissions.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const agents = [
  "Claude Code",
  "Cursor",
  "Codex",
  "GitHub Copilot",
  "Windsurf",
  "Cline",
  "Aider",
  "Continue",
  "Roo Code",
  "Amazon Q",
];

function HomePage() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ── */}
      <section className="noise relative overflow-hidden">
        <div className="dot-grid absolute inset-0" />
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -left-32 top-1/4 size-96 rounded-full bg-primary/[0.07] blur-[100px]" />
        <div className="pointer-events-none absolute -right-32 bottom-1/4 size-96 rounded-full bg-primary/[0.04] blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <div className="mx-auto max-w-3xl">
            {/* Version badge */}
            <div className="animate-slide-up mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1">
                <span className="inline-block size-1.5 animate-[pulse-glow_2s_ease-in-out_infinite] rounded-full bg-primary" />
                <span className="font-mono text-xs text-primary">v0.1.0 beta</span>
              </div>
            </div>

            <h1 className="animate-slide-up delay-100 text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              The package manager
              <br />
              for{" "}
              <span className="text-glow text-primary">AI agent skills</span>
            </h1>

            <p className="animate-slide-up delay-200 mx-auto mt-6 max-w-xl text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
              Publish, discover, and install reusable skills for AI coding
              agents. Version-controlled, security-scanned, ready to use.
            </p>

            <div className="animate-slide-up delay-300 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="glow-green-sm h-11 rounded-lg px-8 font-medium"
                asChild
              >
                <Link to="/register">Get Started</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-lg px-8 font-medium"
                asChild
              >
                <Link to="/explore">Explore Skills</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Terminal ── */}
      <section className="relative border-t border-border/50 bg-card/50">
        <div className="mx-auto max-w-2xl px-6 py-20">
          <div className="animate-slide-up delay-400 glow-green overflow-hidden rounded-xl border border-border/50 bg-background">
            {/* Title bar */}
            <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
              <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="size-2.5 rounded-full bg-[#28c840]/80" />
              <span className="ml-3 font-mono text-[11px] text-muted-foreground/60">
                ~/my-project
              </span>
            </div>
            {/* Terminal body */}
            <div className="relative space-y-3 p-5 font-mono text-[13px] leading-relaxed">
              <div>
                <span className="text-primary">$</span>{" "}
                <span className="terminal-line inline-block">
                  sk publish
                </span>
              </div>
              <div className="text-muted-foreground opacity-0 animate-[fadeIn_0.4s_2s_forwards]">
                <span className="text-muted-foreground/40">{">"}</span>{" "}
                Published{" "}
                <span className="text-primary">myorg/code-review@1.0.0</span>
                {" "}
                <span className="text-muted-foreground/40">{"(3 files, 2.4 KB)"}</span>
              </div>
              <div className="text-muted-foreground opacity-0 animate-[fadeIn_0.4s_2.2s_forwards]">
                <span className="text-muted-foreground/40">{">"}</span>{" "}
                Security scan:{" "}
                <span className="text-primary">passed</span>
              </div>
              <div className="mt-1 opacity-0 animate-[fadeIn_0.4s_2.5s_forwards]">
                <span className="text-primary">$</span>{" "}
                <span className="terminal-line-2 inline-block">
                  sk add myorg/code-review
                </span>
              </div>
              <div className="text-muted-foreground opacity-0 animate-[fadeIn_0.4s_4.5s_forwards]">
                <span className="text-muted-foreground/40">{">"}</span>{" "}
                Installed{" "}
                <span className="text-primary">myorg/code-review@1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative border-t border-border/50">
        <div className="dot-grid absolute inset-0" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12 text-center">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
              Features
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Built for the AI agent ecosystem
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border/50 bg-card/50 p-6 transition-all hover:border-primary/20 hover:bg-card"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 inline-flex rounded-lg border border-primary/10 bg-primary/[0.06] p-2.5 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-[15px] font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent compatibility ── */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
            Compatibility
          </p>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Works with your favorite agents
          </h2>
          <p className="mb-10 text-sm text-muted-foreground">
            Skills are agent-agnostic and work across the entire ecosystem.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {agents.map((agent) => (
              <Badge
                key={agent}
                variant="secondary"
                className="rounded-md border border-border/50 bg-card/80 px-4 py-2 font-mono text-xs font-normal text-muted-foreground transition-colors hover:border-primary/20 hover:text-foreground"
              >
                {agent}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="noise relative border-t border-border/50">
        <div className="dot-grid absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/[0.03] to-transparent" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-28 text-center">
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to get started?
          </h2>
          <p className="mb-8 text-sm text-muted-foreground">
            Create an account and publish your first skill in minutes.
          </p>
          <Button
            size="lg"
            className="glow-green-sm h-11 rounded-lg px-8 font-medium"
            asChild
          >
            <Link to="/register">Create your account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
