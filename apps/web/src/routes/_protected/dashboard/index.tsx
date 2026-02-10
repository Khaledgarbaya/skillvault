import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package,
  Download,
  Layers,
  Upload,
  Key,
  Compass,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <Card className="border-border/50 bg-card/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground/50">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-3">
                {activity.map((event, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
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
          </CardContent>
        </Card>

        {/* Recent skills */}
        <Card className="border-border/50 bg-card/30">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Your Skills</CardTitle>
            {recentSkills.length > 0 && (
              <Link
                to="/dashboard/skills"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {recentSkills.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground/50">
                  No skills yet.
                </p>
                <Link
                  to="/dashboard/skills/new"
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  Publish your first skill
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSkills.map((item) => (
                  <Link
                    key={item.skill.id}
                    to="/dashboard/skills/$name"
                    params={{ name: item.skill.name }}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/30"
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
          </CardContent>
        </Card>
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
    <Card className="border-border/50 bg-card/30">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
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
      className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/20 px-4 py-3 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
      <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground/30" />
    </Link>
  );
}
