import { createFileRoute } from "@tanstack/react-router";
import { WireTrayInventoryDetailPage } from "@/components/leitos/pages/InventoryPage";
export const Route = createFileRoute("/leitos/estoque/$productId")({
  component: InventoryDetailRoute,
});
function InventoryDetailRoute() {
  const { productId } = Route.useParams();
  return <WireTrayInventoryDetailPage productId={productId} />;
}
