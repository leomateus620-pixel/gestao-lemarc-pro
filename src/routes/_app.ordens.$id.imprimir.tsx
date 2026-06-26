import { Suspense, useEffect, useMemo } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getServiceOrder } from "@/lib/api/serviceOrders.functions";
import { getOrderFinancials } from "@/lib/api/financials.functions";
import { ServiceOrderReportDocument } from "@/components/reports/print/ServiceOrderReportDocument";
import { useAuth } from "@/components/app/AuthContext";

export const Route = createFileRoute("/_app/ordens/$id/imprimir")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Relatório` }] }),
  staticData: { hideBottomNav: true },
  component: PrintOSPage,
});

function PrintOSPage() {
  return (
    <div className="min-h-dvh bg-white p-3 sm:p-6 print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Pré-visualização do relatório da OS. Confira os dados antes de imprimir / salvar como PDF.
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer size={15} /> Imprimir / Salvar PDF
        </Button>
      </div>
      <div className="mx-auto max-w-[900px] rounded border border-slate-200 bg-white p-4 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando dados…</p>}>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}

function Body() {
  const { id } = Route.useParams();
  const { displayName } = useAuth();
  const orderFn = useServerFn(getServiceOrder);
  const finFn = useServerFn(getOrderFinancials);
  const { data: order } = useSuspenseQuery(
    queryOptions({
      queryKey: ["service-order", id],
      queryFn: () => orderFn({ data: { id } }),
    }),
  );
  const { data: fin } = useSuspenseQuery(
    queryOptions({
      queryKey: ["order-financials", id],
      queryFn: () => finFn({ data: { orderId: id } }),
    }),
  );
  if (!order) throw notFound();
  const generatedAt = useMemo(() => new Date(), []);
  useEffect(() => {
    document.title = `os-${order.number}-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  }, [order.number, generatedAt]);
  return (
    <ServiceOrderReportDocument
      order={order}
      entries={fin.entries}
      financials={fin.financials}
      generatedAt={generatedAt}
      authorName={displayName ?? null}
    />
  );
}
