import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ServiceOrderWizard } from "@/components/ordens/ServiceOrderWizard";

export const Route = createFileRoute("/_app/ordens/nova")({
  head: () => ({ meta: [{ title: "Nova OS — Gestão Lemarc" }] }),
  component: NovaOSPage,
});

function NovaOSPage() {
  return (
    <AppShell title="Nova ordem de serviço" back>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <ServiceOrderWizard />
      </Suspense>
    </AppShell>
  );
}
