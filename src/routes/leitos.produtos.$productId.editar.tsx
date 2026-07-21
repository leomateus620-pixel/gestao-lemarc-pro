import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductFormPage } from "@/components/leitos/pages/ProductsPage";
export const Route = createFileRoute("/leitos/produtos/$productId/editar")({
  component: ProductEditRoute,
});
function ProductEditRoute() {
  const { productId } = Route.useParams();
  return <WireTrayProductFormPage productId={productId} />;
}
