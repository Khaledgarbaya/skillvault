import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { User, Shield } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  updateProfileAction,
  changePasswordAction,
} from "~/lib/dashboard-fns";

export const Route = createFileRoute("/_protected/dashboard/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();

  const [displayName, setDisplayName] = useState(
    user.name ?? "",
  );
  const [username, setUsername] = useState(
    user.username ?? "",
  );
  const [profileSaving, setProfileSaving] = useState(false);

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
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-primary">
          Account
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="size-4 text-primary" />
          <h2 className="text-[13px] font-medium">Profile</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-[13px]">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username" className="text-[13px]">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground/70">
              Used in skill names like <span className="font-mono text-primary">{username || "you"}/my-skill</span>
            </p>
          </div>
          {user.image && (
            <div className="space-y-2">
              <Label className="text-[13px]">Avatar</Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border border-border/50">
                  <AvatarImage src={user.image} alt="" />
                  <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                    {(user.name ?? "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground/70">
                  Managed by your identity provider (GitHub)
                </span>
              </div>
            </div>
          )}
          <Button onClick={handleProfileSave} disabled={profileSaving} size="sm">
            {profileSaving ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h2 className="text-[13px] font-medium">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-[13px]">Current Password</Label>
            <Input
              id="current-password"
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-[13px]">New Password</Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-[13px]">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
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
            size="sm"
          >
            {passwordSaving ? "Changing..." : "Change Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
