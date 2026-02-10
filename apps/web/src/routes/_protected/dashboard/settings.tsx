import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useSession } from "~/lib/auth/client";
import {
  updateProfileAction,
  changePasswordAction,
} from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = useSession();

  // Profile form
  const [displayName, setDisplayName] = useState(
    session?.user.name ?? "",
  );
  const [username, setUsername] = useState(
    session?.user.username ?? "",
  );
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  async function handleProfileSave() {
    setProfileSaving(true);
    try {
      await updateProfileAction({
        data: {
          displayName: displayName || undefined,
          username: username || undefined,
        },
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePasswordAction({
        data: { currentPassword, newPassword },
      });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used in skill names like <span className="font-mono">{username || "you"}/my-skill</span>
            </p>
          </div>
          {session?.user.image && (
            <div className="space-y-2">
              <Label>Avatar</Label>
              <div className="flex items-center gap-3">
                <img
                  src={session.user.image}
                  alt=""
                  className="size-10 rounded-full"
                />
                <span className="text-xs text-muted-foreground">
                  Managed by your identity provider (GitHub)
                </span>
              </div>
            </div>
          )}
          <Button onClick={handleProfileSave} disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/50 bg-card/30">
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              className="rounded"
            />
            Show passwords
          </label>
          <Button
            onClick={handlePasswordChange}
            disabled={
              passwordSaving ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
