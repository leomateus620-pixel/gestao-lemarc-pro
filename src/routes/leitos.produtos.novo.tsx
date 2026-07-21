import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductFormPage } from "@/components/leitos/pages/ProductsPage";
export const Route = createFileRoute("/leitos/produtos/novo")({
  component: WireTrayProductFormPage,
});
