import { createFileRoute } from "@tanstack/react-router";
import { WireTrayProductionPage } from "@/components/leitos/pages/ProductionPage";
export const Route = createFileRoute("/leitos/producao/")({ component: WireTrayProductionPage });
