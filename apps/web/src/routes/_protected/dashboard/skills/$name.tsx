import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
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
import { MoreHorizontal, Layers, AlertTriangle } from "lucide-react";
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

  const [description, setDescription] = useState(skill.description ?? "");
  const [repositoryUrl, setRepositoryUrl] = useState(
    skill.repositoryUrl ?? "",
  );
  const [isPublic, setIsPublic] = useState(skill.visibility === "public");
  const [saving, setSaving] = useState(false);

  const [versionAction, setVersionAction] = useState<{
    versionId: string;
    version: string;
    status: "deprecated" | "yanked";
  } | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSaving, setActionSaving] = useState(false);

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
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
          Skill Settings
        </p>
        <h1 className="font-mono text-xl font-bold tracking-tight">
          {ownerUsername}/{skill.name}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage settings for this skill.
        </p>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5">
        <h2 className="mb-4 text-[13px] font-medium">Settings</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[13px]">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repo-url" className="text-[13px]">Repository URL</Label>
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
            <Label htmlFor="visibility" className="cursor-pointer text-[13px]">
              {isPublic ? "Public" : "Private"}
            </Label>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Versions table */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="text-[13px] font-medium">Versions</h2>
        </div>
        {versions.length === 0 ? (
          <div className="flex flex-col items-center py-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full border border-border/50 bg-muted/30">
              <Layers className="size-4 text-muted-foreground/50" />
            </div>
            <p className="text-[13px] text-muted-foreground/50">
              No versions published yet.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Version</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Status</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Scan</TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Published</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id} className="border-border/50">
                    <TableCell className="font-mono text-[13px]">
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
                              className="size-7"
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
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-[13px] font-medium text-destructive">
            Danger Zone
          </h2>
        </div>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Permanently delete this skill and all its versions. This action
          cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          Delete Skill
        </Button>
      </div>

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
            <Label htmlFor="action-message" className="text-[13px]">
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
