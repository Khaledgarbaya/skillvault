import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { CopyButton } from "~/components/copy-button";
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
import { Plus } from "lucide-react";
import { formatRelativeTime } from "~/lib/format";
import {
  fetchUserTokens,
  createTokenAction,
  revokeTokenAction,
} from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/tokens")({
  loader: () => fetchUserTokens(),
  component: TokensPage,
});

function TokensPage() {
  const tokens = Route.useLoaderData();
  const navigate = useNavigate();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [creating, setCreating] = useState(false);

  // Token result
  const [newToken, setNewToken] = useState<string | null>(null);

  // Revoke dialog
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function handleCreate() {
    if (!tokenName.trim()) return;
    setCreating(true);
    try {
      const result = await createTokenAction({
        data: { name: tokenName.trim(), scopes: "publish,read" },
      });
      setNewToken(result.token);
      setTokenName("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create token",
      );
    } finally {
      setCreating(false);
    }
  }

  function handleCloseCreate() {
    setCreateOpen(false);
    setNewToken(null);
    setTokenName("");
    // Reload tokens
    navigate({ to: "/dashboard/tokens" });
  }

  async function handleRevoke() {
    if (!revokeId) return;
    setRevoking(true);
    try {
      await revokeTokenAction({ data: { tokenId: revokeId } });
      toast.success("Token revoked");
      setRevokeId(null);
      navigate({ to: "/dashboard/tokens" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke token",
      );
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Tokens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tokens for CLI and API access.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Token
        </Button>
      </div>

      {tokens.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-card/20 py-16 text-center">
          <p className="text-muted-foreground/50">No API tokens yet.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Create your first token
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id} className="border-border/50">
                  <TableCell className="font-medium">{token.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {token.scopes.split(",").map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="h-5 text-[10px]"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {token.lastUsedAt
                      ? formatRelativeTime(token.lastUsedAt)
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(token.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setRevokeId(token.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create token dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && handleCloseCreate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newToken ? "Token Created" : "Create API Token"}
            </DialogTitle>
            <DialogDescription>
              {newToken
                ? "Copy this token now. You won't be able to see it again."
                : "Create a token for CLI or API access."}
            </DialogDescription>
          </DialogHeader>
          {newToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <code className="flex-1 break-all font-mono text-xs text-primary">
                  {newToken}
                </code>
                <CopyButton value={newToken} />
              </div>
              <p className="text-xs text-amber-500">
                Make sure to copy this token. It will only be shown once.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Token Name</Label>
                <Input
                  id="token-name"
                  placeholder="e.g. CI/CD Pipeline"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newToken ? (
              <Button onClick={handleCloseCreate}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseCreate}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!tokenName.trim() || creating}
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog
        open={!!revokeId}
        onOpenChange={(open) => !open && setRevokeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke token?</AlertDialogTitle>
            <AlertDialogDescription>
              Any applications using this token will lose access immediately.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {revoking ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
