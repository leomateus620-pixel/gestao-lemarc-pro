import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductionDetailPage } from "@/components/leitos/pages/ProductionPage";
export const Route = createFileRoute("/leitos/producao/$productionId")({
  component: ProductionDetailRoute,
});
function ProductionDetailRoute() {
  const { productionId } = Route.useParams();
  return <WireTrayProductionDetailPage productionId={productionId} />;
}
