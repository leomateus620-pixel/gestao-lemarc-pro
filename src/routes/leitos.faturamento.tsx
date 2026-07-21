import { createFileRoute } from "@tanstack/react-router";
import { WireTrayBillingPage } from "@/components/leitos/pages/OperationsPage";
export const Route = createFileRoute("/leitos/faturamento")({ component: WireTrayBillingPage });
