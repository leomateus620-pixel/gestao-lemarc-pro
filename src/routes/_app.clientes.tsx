import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAdmin } from "@/lib/auth/requireAdmin";

export const Route = createFileRoute("/_app/clientes")({
  component: () => (
    <RequireAdmin>
      <Outlet />
    </RequireAdmin>
  ),
});