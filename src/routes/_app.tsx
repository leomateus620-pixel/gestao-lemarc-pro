import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/app/BottomNav";
import { RoleProvider } from "@/components/app/RoleContext";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <RoleProvider>
      <Outlet />
      <BottomNav />
    </RoleProvider>
  );
}
