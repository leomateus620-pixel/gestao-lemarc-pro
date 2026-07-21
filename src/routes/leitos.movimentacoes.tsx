import { createFileRoute } from "@tanstack/react-router";
import { WireTrayMovementsPage } from "@/components/leitos/pages/MiscPages";
export const Route = createFileRoute("/leitos/movimentacoes")({ component: WireTrayMovementsPage });
