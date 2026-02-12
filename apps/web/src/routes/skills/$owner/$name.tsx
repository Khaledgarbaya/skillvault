import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/skills/$owner/$name")({
  component: () => <Outlet />,
});
