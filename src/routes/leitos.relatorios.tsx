import { createFileRoute } from "@tanstack/react-router";
import { WireTrayReportsPage } from "@/components/leitos/pages/MiscPages";
export const Route = createFileRoute("/leitos/relatorios")({ component: WireTrayReportsPage });
