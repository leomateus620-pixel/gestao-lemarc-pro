import { createFileRoute } from "@tanstack/react-router";
import { WireTrayOrderDetailPage } from "@/components/leitos/pages/OrdersPage";
export const Route = createFileRoute("/leitos/pedidos/$orderId")({ component: OrderDetailRoute });
function OrderDetailRoute() {
  const { orderId } = Route.useParams();
  return <WireTrayOrderDetailPage orderId={orderId} />;
}
