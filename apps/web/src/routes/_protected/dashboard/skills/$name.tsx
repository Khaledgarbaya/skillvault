import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScanStatusDot } from "~/components/scan-status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { formatRelativeTime } from "~/lib/format";
import {
  fetchSkillSettings,
  updateSkillAction,
  deleteSkillAction,
  updateVersionStatusAction,
} from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/skills/$name")({
  loader: ({ params }) =>
    fetchSkillSettings({ data: { name: params.name } }),
  component: SkillSettings,
});

function SkillSettings() {
  const { skill, ownerUsername, versions } = Route.useLoaderData();
  const navigate = useNavigate();

  // Edit form
  const [description, setDescription] = useState(skill.description ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(
    skill.repositoryUrl ?? "",
  );
  const [isPublic, setIsPublic] = useState(skill.visibility === "public");
  const [saving, setSaving] = useState(false);

  // Version action dialog
  const [versionAction, setVersionAction] = useState<{
    versionId: string;
    version: string;
    status: "deprecated" | "yanked";
  } | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSkillAction({
        data: {
          skillId: skill.id,
          description: description || undefined,
          visibility: isPublic ? "public" : "private",
          repositoryUrl: repositoryUrl || undefined,
        },
      });
      toast.success("Skill updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update skill",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVersionAction() {
    if (!versionAction) return;
    setActionSaving(true);
    try {
      await updateVersionStatusAction({
        data: {
          versionId: versionAction.versionId,
          status: versionAction.status,
          message: actionMessage || undefined,
        },
      });
      toast.success(
        `Version ${versionAction.version} ${versionAction.status}`,
      );
      setVersionAction(null);
      setActionMessage("");
      // Reload
      navigate({ to: "/dashboard/skills/$name", params: { name: skill.name } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Action failed",
      );
    } finally {
      setActionSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSkillAction({ data: { skillId: skill.id } });
      toast.success("Skill deleted");
      navigate({ to: "/dashboard/skills" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete skill",
      );
    } finally {
      setDeleting(false);
    }
  }

  const statusBadge = {
    active: "outline" as const,
    deprecated: "secondary" as const,
    yanked: "destructive" as const,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-xl font-bold">
          {ownerUsername}/{skill.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage settings for this skill.
        </p>
      </div>

      {/* Edit form */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository URL</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/..."
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="visibility"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
            <Label htmlFor="visibility" className="cursor-pointer">
              {isPublic ? "Public" : "Private"}
            </Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Versions table */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-base">Versions</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground/50">
              No versions published yet.
            </p>
          ) : (
            <div className="rounded-lg border border-border/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scan</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => (
                    <TableRow key={v.id} className="border-border/50">
                      <TableCell className="font-mono text-sm">
                        {v.version}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadge[v.status]}
                          className="h-5 text-[10px]"
                        >
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScanStatusDot
                          status={
                            v.scan?.overallStatus as
                              | "pass"
                              | "warn"
                              | "fail"
                              | null
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatRelativeTime(v.createdAt)}
                      </TableCell>
                      <TableCell>
                        {v.status === "active" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  setVersionAction({
                                    versionId: v.id,
                                    version: v.version,
                                    status: "deprecated",
                                  })
                                }
                              >
                                Deprecate
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setVersionAction({
                                    versionId: v.id,
                                    version: v.version,
                                    status: "yanked",
                                  })
                                }
                              >
                                Yank
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Permanently delete this skill and all its versions. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            Delete Skill
          </Button>
        </CardContent>
      </Card>

      {/* Version action dialog */}
      <Dialog
        open={!!versionAction}
        onOpenChange={(open) => !open && setVersionAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {versionAction?.status === "deprecated"
                ? "Deprecate"
                : "Yank"}{" "}
              version {versionAction?.version}
            </DialogTitle>
            <DialogDescription>
              {versionAction?.status === "deprecated"
                ? "Deprecated versions remain installable but users will see a warning."
                : "Yanked versions cannot be installed by new users."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-message">
              {versionAction?.status === "deprecated"
                ? "Deprecation message (optional)"
                : "Reason (optional)"}
            </Label>
            <Textarea
              id="action-message"
              value={actionMessage}
              onChange={(e) => setActionMessage(e.target.value)}
              placeholder={
                versionAction?.status === "deprecated"
                  ? "Use v2.0.0 instead"
                  : "Security vulnerability found"
              }
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVersionAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                versionAction?.status === "yanked" ? "destructive" : "default"
              }
              onClick={handleVersionAction}
              disabled={actionSaving}
            >
              {actionSaving
                ? "Saving..."
                : versionAction?.status === "deprecated"
                  ? "Deprecate"
                  : "Yank"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {skill.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the skill, all versions, and remove
              tarballs from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
