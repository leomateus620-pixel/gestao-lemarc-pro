import { createFileRoute } from "@tanstack/react-router";
import { WireTrayInventoryPage } from "@/components/leitos/pages/InventoryPage";
export const Route = createFileRoute("/leitos/estoque/")({ component: WireTrayInventoryPage });
