import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AppShell } from "@/components/app/AppShell";
import { ServiceOrderWizard } from "@/components/ordens/ServiceOrderWizard";

const searchSchema = z.object({
  clientId: z.string().optional(),
  unitId: z.string().optional(),
});

export const Route = createFileRoute("/_app/ordens/nova")({
  head: () => ({ meta: [{ title: "Nova OS — Gestão Lemarc" }] }),
  validateSearch: zodValidator(searchSchema),
  component: NovaOSPage,
});

function NovaOSPage() {
  const { clientId, unitId } = Route.useSearch();
  return (
    <AppShell title="Nova ordem de serviço" back>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <ServiceOrderWizard initialClientId={clientId} initialUnitId={unitId} />
      </Suspense>
    </AppShell>
  );
}
