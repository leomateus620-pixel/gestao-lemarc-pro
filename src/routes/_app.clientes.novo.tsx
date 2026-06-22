import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ClientWizard } from "@/components/clientes/ClientWizard";

export const Route = createFileRoute("/_app/clientes/novo")({
  head: () => ({ meta: [{ title: "Novo cliente — Gestão Lemarc" }] }),
  component: NovoClientePage,
});

function NovoClientePage() {
  return (
    <AppShell title="Novo cliente" back>
      <ClientWizard />
    </AppShell>
  );
}