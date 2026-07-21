import { createFileRoute } from "@tanstack/react-router";
import { WireTrayDashboardPage } from "@/components/leitos/pages/DashboardPage";

export const Route = createFileRoute("/leitos/")({
  component: WireTrayDashboardPage,
});
