import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Package } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScanStatusDot } from "~/components/scan-status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatRelativeTime, formatDownloads } from "~/lib/format";
import { fetchUserSkills } from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/skills/")({
  loader: () => fetchUserSkills(),
  component: SkillsList,
});

function SkillsList() {
  const skills = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
            Registry
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Manage your published skills.
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/dashboard/skills/new">
            <Plus className="size-3.5" />
            New Skill
          </Link>
        </Button>
      </div>

      {skills.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-border/50 bg-card/50 py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-border/50 bg-muted/30">
            <Package className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-[13px] text-muted-foreground/50">No skills yet.</p>
          <Link
            to="/dashboard/skills/new"
            className="mt-2 text-[13px] text-primary hover:underline"
          >
            Publish your first skill
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Name</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Visibility</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Version</TableHead>
                <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Downloads</TableHead>
                <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Scan</TableHead>
                <TableHead className="text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((item) => (
                <TableRow
                  key={item.skill.id}
                  className="border-border/50 cursor-pointer transition-colors hover:bg-accent/50"
                >
                  <TableCell>
                    <Link
                      to="/dashboard/skills/$name"
                      params={{ name: item.skill.name }}
                      className="font-mono text-[13px] transition-colors hover:text-primary"
                    >
                      {item.ownerUsername}/{item.skill.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.skill.visibility === "public"
                          ? "outline"
                          : "secondary"
                      }
                      className={`h-5 text-[10px] ${
                        item.skill.visibility === "public"
                          ? "border-primary/30 text-primary"
                          : ""
                      }`}
                    >
                      {item.skill.visibility}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.latestVersion?.version ?? (
                      <span className="text-muted-foreground/30">&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-[13px]">
                    {formatDownloads(item.skill.downloadCount)}
                  </TableCell>
                  <TableCell>
                    <ScanStatusDot
                      status={
                        item.scan?.overallStatus as
                          | "pass"
                          | "warn"
                          | "fail"
                          | null
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatRelativeTime(item.skill.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
