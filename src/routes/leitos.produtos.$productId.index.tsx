import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductDetailPage } from "@/components/leitos/pages/ProductsPage";
export const Route = createFileRoute("/leitos/produtos/$productId/")({
  component: ProductDetailRoute,
});
function ProductDetailRoute() {
  const { productId } = Route.useParams();
  return <WireTrayProductDetailPage productId={productId} />;
}
