import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Download,
  Layers,
  Upload,
  Key,
  Compass,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { ScanStatusDot } from "~/components/scan-status-dot";
import { formatRelativeTime, formatDownloads } from "~/lib/format";
import { fetchDashboardData } from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/")({
  loader: () => fetchDashboardData(),
  component: DashboardHome,
});

function DashboardHome() {
  const { stats, activity, recentSkills } = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
          Overview
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Overview of your skills and activity.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Package className="size-4" />}
          label="Total Skills"
          value={stats.totalSkills}
        />
        <StatCard
          icon={<Download className="size-4" />}
          label="Total Downloads"
          value={formatDownloads(stats.totalDownloads)}
        />
        <StatCard
          icon={<Layers className="size-4" />}
          label="Published Versions"
          value={stats.totalVersions}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          to="/dashboard/skills/new"
          icon={<Upload className="size-4" />}
          label="Publish New Skill"
        />
        <QuickAction
          to="/dashboard/tokens"
          icon={<Key className="size-4" />}
          label="Create Token"
        />
        <QuickAction
          to="/explore"
          icon={<Compass className="size-4" />}
          label="Explore Skills"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="group relative rounded-xl border border-border/50 bg-card/50 transition-all duration-200 hover:border-primary/20 hover:bg-card">
          <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative p-5">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <h2 className="text-[13px] font-medium">Recent Activity</h2>
            </div>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
                  <Activity className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-[13px] text-muted-foreground/50">
                  No recent activity.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activity.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-1.5 rounded-full ${
                          event.type === "publish"
                            ? "bg-primary"
                            : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="text-muted-foreground">
                        {event.type === "publish" ? "Published" : "Installed"}
                      </span>
                      <span className="font-mono text-xs">
                        {event.skillName}@{event.version}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground/50">
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent skills */}
        <div className="group relative rounded-xl border border-border/50 bg-card/50 transition-all duration-200 hover:border-primary/20 hover:bg-card">
          <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <h2 className="text-[13px] font-medium">Your Skills</h2>
              </div>
              {recentSkills.length > 0 && (
                <Link
                  to="/dashboard/skills"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  View all
                </Link>
              )}
            </div>
            {recentSkills.length === 0 ? (
              <div className="flex flex-col items-center py-6">
                <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
                  <Package className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-[13px] text-muted-foreground/50">
                  No skills yet.
                </p>
                <Link
                  to="/dashboard/skills/new"
                  className="mt-2 text-[13px] text-primary hover:underline"
                >
                  Publish your first skill
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentSkills.map((item) => (
                  <Link
                    key={item.skill.id}
                    to="/dashboard/skills/$name"
                    params={{ name: item.skill.name }}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {item.ownerUsername}/{item.skill.name}
                      </span>
                      {item.latestVersion && (
                        <Badge variant="outline" className="h-5 text-[10px]">
                          v{item.latestVersion.version}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <ScanStatusDot
                        status={item.scan?.overallStatus as "pass" | "warn" | "fail" | null}
                      />
                      <span className="text-xs text-muted-foreground/50">
                        {formatDownloads(item.skill.downloadCount)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-card/50 transition-all duration-200 hover:border-primary/20 hover:bg-card">
      <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center gap-4 p-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group relative flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-[13px] transition-all duration-200 hover:border-primary/20 hover:bg-card"
    >
      <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative text-muted-foreground">{icon}</span>
      <span className="relative">{label}</span>
      <ArrowUpRight className="relative ml-auto size-3.5 text-muted-foreground/30 transition-colors group-hover:text-primary/50" />
    </Link>
  );
}
