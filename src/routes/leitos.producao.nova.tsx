import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductionFormPage } from "@/components/leitos/pages/ProductionPage";
export const Route = createFileRoute("/leitos/producao/nova")({
  component: WireTrayProductionFormPage,
});
