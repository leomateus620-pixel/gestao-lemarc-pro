import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductsPage } from "@/components/leitos/pages/ProductsPage";
export const Route = createFileRoute("/leitos/produtos/")({ component: WireTrayProductsPage });
