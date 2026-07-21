import { createFileRoute } from "@tanstack/react-router";
import { WireTrayOrdersPage } from "@/components/leitos/pages/OrdersPage";
export const Route = createFileRoute("/leitos/pedidos/")({ component: WireTrayOrdersPage });
