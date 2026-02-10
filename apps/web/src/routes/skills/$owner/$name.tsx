import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getSkillByOwnerAndName,
  getLatestVersion,
  getVersions,
  getScanForVersion,
} from "~/lib/db/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { CopyButton } from "~/components/copy-button";
import { ScanReport } from "~/components/scan-report";
import { ScanStatusDot } from "~/components/scan-status-dot";
import { formatRelativeTime, formatDownloads, formatBytes } from "~/lib/format";

const fetchSkillDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { owner: string; name: string }) => data)
  .handler(async ({ data }) => {
    const db = drizzle(env.DB);
    const result = await getSkillByOwnerAndName(db, data.owner, data.name);
    if (!result || result.skill.visibility !== "public") {
      throw notFound();
    }

    const [latestVersion, versions] = await Promise.all([
      getLatestVersion(db, result.skill.id),
      getVersions(db, result.skill.id),
    ]);

    const scan = latestVersion
      ? await getScanForVersion(db, latestVersion.id)
      : null;

    return {
      skill: result.skill,
      ownerUsername: result.ownerUsername,
      latestVersion,
      versions,
      scan,
    };
  });

export const Route = createFileRoute("/skills/$owner/$name")({
  loader: ({ params }) =>
    fetchSkillDetail({ data: { owner: params.owner, name: params.name } }),
  component: SkillDetailPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-6xl px-6 py-24 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-border/50 bg-card/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
      </div>
      <h1 className="mb-2 text-lg font-semibold">Skill not found</h1>
      <p className="text-sm text-muted-foreground">
        The skill you're looking for doesn't exist or is private.
      </p>
    </div>
  ),
});

function SkillDetailPage() {
  const { skill, ownerUsername, latestVersion, versions, scan } =
    Route.useLoaderData();

  const installCommand = `sk add ${ownerUsername}/${skill.name}`;

  return (
    <div className="relative">
      <div className="dot-grid absolute inset-0 h-64" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
          {/* ── Main column ── */}
          <div className="min-w-0">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-1.5 font-mono text-xs text-muted-foreground/50">
              <Link to="/explore" className="hover:text-muted-foreground">
                explore
              </Link>
              <span>/</span>
              <span className="text-muted-foreground">{ownerUsername}</span>
              <span>/</span>
              <span className="text-foreground">{skill.name}</span>
            </nav>

            {/* Header */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-primary/10 bg-primary/[0.06] font-mono text-xs font-bold text-primary">
                  {ownerUsername.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-xl font-bold sm:text-2xl">
                  <span className="text-muted-foreground">{ownerUsername}/</span>
                  <span className="text-glow text-primary">{skill.name}</span>
                </h1>
                {scan && <ScanStatusDot status={scan.overallStatus} className="size-3" />}
              </div>
              {skill.description && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>
              )}
            </div>

            {/* Install box */}
            <div className="mb-8 flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-3 font-mono text-[13px]">
              <span className="text-primary">$</span>
              <code className="flex-1 select-all text-foreground/80">{installCommand}</code>
              <CopyButton value={installCommand} />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="readme">
              <TabsList className="h-9 rounded-lg bg-card/80">
                <TabsTrigger value="readme" className="rounded-md text-xs">
                  README
                </TabsTrigger>
                <TabsTrigger value="versions" className="rounded-md text-xs">
                  Versions
                  <span className="ml-1.5 rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                    {versions.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="scan" className="rounded-md text-xs">
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="readme" className="mt-6">
                {latestVersion?.skillMdContent ? (
                  <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:font-mono prose-code:text-[13px] prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:rounded-xl prose-pre:border prose-pre:border-border/50 prose-pre:bg-card/80">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {latestVersion.skillMdContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground/60">
                      No README available for this skill.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="versions" className="mt-6">
                {versions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground/60">
                      No versions published yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <Link
                        key={v.id}
                        to="/skills/$owner/$name/$version"
                        params={{
                          owner: ownerUsername,
                          name: skill.name,
                          version: v.version,
                        }}
                        className="group flex items-center justify-between rounded-lg border border-border/50 bg-card/30 px-4 py-3 transition-all hover:border-primary/20 hover:bg-card/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            v{v.version}
                          </span>
                          <Badge
                            variant={
                              v.status === "active"
                                ? "default"
                                : v.status === "deprecated"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="h-5 text-[10px]"
                          >
                            {v.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground/50">
                          <span>{v.fileCount} files</span>
                          <span>{formatBytes(v.totalSizeBytes)}</span>
                          <span>{formatRelativeTime(v.createdAt)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scan" className="mt-6">
                <ScanReport scan={scan} />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-5">
            <div className="rounded-xl border border-border/50 bg-card/30 p-5">
              <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Package Info
              </h3>
              <dl className="space-y-4 text-sm">
                <SidebarItem label="Downloads">
                  <span className="font-mono font-medium">
                    {formatDownloads(skill.downloadCount)}
                  </span>
                </SidebarItem>
                {latestVersion && (
                  <SidebarItem label="Latest">
                    <Badge variant="secondary" className="h-5 rounded border-border/50 font-mono text-[10px] font-normal">
                      v{latestVersion.version}
                    </Badge>
                  </SidebarItem>
                )}
                <SidebarItem label="Published">
                  <span className="font-mono text-xs">
                    {formatRelativeTime(skill.createdAt)}
                  </span>
                </SidebarItem>
                {latestVersion && (
                  <>
                    <SidebarItem label="Files">
                      <span className="font-mono text-xs">{latestVersion.fileCount}</span>
                    </SidebarItem>
                    <SidebarItem label="Size">
                      <span className="font-mono text-xs">
                        {formatBytes(latestVersion.totalSizeBytes)}
                      </span>
                    </SidebarItem>
                  </>
                )}
                {skill.repositoryUrl && (
                  <SidebarItem label="Source">
                    <a
                      href={skill.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4" /><path d="M9 18c-4.51 2-5-2-7-2" />
                      </svg>
                      Repository
                    </a>
                  </SidebarItem>
                )}
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-muted-foreground/50">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
