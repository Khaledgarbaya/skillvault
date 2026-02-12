import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/d1";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getSkillByOwnerAndName,
  getVersion,
  getVersions,
  getBasicScanForVersion,
  getAiScanForVersion,
} from "~/lib/db/queries";
import { loggingMiddleware, cloudflareMiddleware } from "~/lib/middleware";
import { Badge } from "~/components/ui/badge";
import { CopyButton } from "~/components/copy-button";
import { ScanReport } from "~/components/scan-report";
import { formatRelativeTime, formatBytes } from "~/lib/format";
import type { LoggedContext } from "~/lib/middleware/types";

const fetchVersionDetail = createServerFn({ method: "GET" })
  .middleware([loggingMiddleware, cloudflareMiddleware])
  .inputValidator(
    (data: { owner: string; name: string; version: string }) => data,
  )
  .handler(async ({ data, context }: { data: { owner: string; name: string; version: string }; context: LoggedContext }) => {
    const db = drizzle(context.cloudflare.env.DB);
    const result = await getSkillByOwnerAndName(db, data.owner, data.name);
    if (!result || result.skill.visibility !== "public") {
      throw notFound();
    }

    const version = await getVersion(db, result.skill.id, data.version);
    if (!version) {
      throw notFound();
    }

    const [scan, aiScan, allVersions] = await Promise.all([
      getBasicScanForVersion(db, version.id),
      getAiScanForVersion(db, version.id),
      getVersions(db, result.skill.id),
    ]);

    const versionIndex = allVersions.findIndex((v) => v.id === version.id);
    const previousVersion =
      versionIndex < allVersions.length - 1
        ? allVersions[versionIndex + 1]
        : null;

    return {
      skill: result.skill,
      ownerUsername: result.ownerUsername,
      version,
      scan,
      aiScan,
      previousVersion,
    };
  });

export const Route = createFileRoute("/skills/$owner/$name/$version")({
  loader: ({ params }) =>
    fetchVersionDetail({
      data: {
        owner: params.owner,
        name: params.name,
        version: params.version,
      },
    }),
  component: VersionDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-6xl px-6 py-24 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-border/50 bg-card/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      </div>
      <h1 className="mb-2 text-lg font-semibold">Version not found</h1>
      <p className="text-sm text-muted-foreground">
        This version doesn't exist or the skill is private.
      </p>
    </div>
  ),
});

function VersionDetailPage() {
  const { skill, ownerUsername, version, scan, aiScan, previousVersion } =
    Route.useLoaderData();

  const installCommand = `sk add ${ownerUsername}/${skill.name}@${version.version}`;

  return (
    <div className="relative">
      <div className="dot-grid absolute inset-0 h-64" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted-foreground/50">
          <Link to="/explore" className="hover:text-muted-foreground">
            explore
          </Link>
          <span>/</span>
          <Link
            to="/skills/$owner/$name"
            params={{ owner: ownerUsername, name: skill.name }}
            className="hover:text-muted-foreground"
          >
            {ownerUsername}/{skill.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">v{version.version}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">
              <span className="text-muted-foreground">{ownerUsername}/{skill.name}@</span>
              <span className="text-glow text-primary">{version.version}</span>
            </h1>
            <Badge
              variant={
                version.status === "active"
                  ? "default"
                  : version.status === "deprecated"
                    ? "secondary"
                    : "destructive"
              }
              className="h-5 text-[10px]"
            >
              {version.status}
            </Badge>
          </div>
          {version.status === "deprecated" && version.deprecationMessage && (
            <div className="mt-3 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-2.5 text-sm text-yellow-400">
              {version.deprecationMessage}
            </div>
          )}
          {version.status === "yanked" && version.yankReason && (
            <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
              {version.yankReason}
            </div>
          )}
        </div>

        {/* Install box */}
        <div className="mb-8 flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-3 font-mono text-[13px]">
          <span className="text-primary">$</span>
          <code className="flex-1 select-all text-foreground/80">{installCommand}</code>
          <CopyButton value={installCommand} />
        </div>

        {/* Metadata grid */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetadataCard
            label="Published"
            value={formatRelativeTime(version.createdAt)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <MetadataCard
            label="Files"
            value={String(version.fileCount)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </svg>
            }
          />
          <MetadataCard
            label="Size"
            value={formatBytes(version.totalSizeBytes)}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            }
          />
          <MetadataCard
            label="Hash"
            value={version.contentHash.slice(0, 12)}
            mono
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" />
              </svg>
            }
          />
        </div>

        {/* Diff link */}
        {previousVersion && (
          <div className="mb-10">
            <a
              href={`/api/v1/skills/${ownerUsername}/${skill.name}/diff/${previousVersion.version}/${version.version}`}
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-4 py-2.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/20 hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v14" /><path d="m5 10 7 7 7-7" />
              </svg>
              Diff from v{previousVersion.version}
            </a>
          </div>
        )}

        {/* Security scan */}
        <div className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            Security Scan
          </h2>
          <ScanReport scan={scan} aiScan={aiScan} />
        </div>

        {/* README */}
        {version.skillMdContent && (
          <div>
            <h2 className="mb-4 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
              README
            </h2>
            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-card/80">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {version.skillMdContent}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataCard({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground/40">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}
