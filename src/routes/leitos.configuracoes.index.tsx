import { createFileRoute } from "@tanstack/react-router";
import { WireTraySettingsPage } from "@/components/leitos/pages/MiscPages";
export const Route = createFileRoute("/leitos/configuracoes/")({ component: WireTraySettingsPage });
