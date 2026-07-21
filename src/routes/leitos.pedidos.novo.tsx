import { createFileRoute } from "@tanstack/react-router";
import { WireTrayOrderWizardPage } from "@/components/leitos/pages/OrdersPage";
export const Route = createFileRoute("/leitos/pedidos/novo")({
  component: WireTrayOrderWizardPage,
});
