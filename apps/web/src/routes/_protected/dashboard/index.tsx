import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to SKVault. Manage your skills and API tokens here.
      </p>
    </div>
  );
}
