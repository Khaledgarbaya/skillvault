import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your published skills.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/skills/new">
            <Plus className="mr-2 size-4" />
            New Skill
          </Link>
        </Button>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/20 py-16 text-center">
          <p className="text-muted-foreground/50">No skills yet.</p>
          <Link
            to="/dashboard/skills/new"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Publish your first skill
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Downloads</TableHead>
                <TableHead>Scan</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((item) => (
                <TableRow
                  key={item.skill.id}
                  className="border-border/50 cursor-pointer"
                >
                  <TableCell>
                    <Link
                      to="/dashboard/skills/$name"
                      params={{ name: item.skill.name }}
                      className="font-mono text-sm hover:text-primary"
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
                  <TableCell className="text-right text-sm">
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
