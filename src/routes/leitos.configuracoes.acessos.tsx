import { createFileRoute } from "@tanstack/react-router";
import { WireTrayAccessPage } from "@/components/leitos/pages/MiscPages";
export const Route = createFileRoute("/leitos/configuracoes/acessos")({
  component: WireTrayAccessPage,
});
