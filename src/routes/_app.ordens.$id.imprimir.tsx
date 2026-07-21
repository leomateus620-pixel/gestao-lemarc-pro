import { Suspense, useEffect, useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileDown, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getServiceOrder } from "@/lib/api/serviceOrders.functions";
import { getOrderFinancials } from "@/lib/api/financials.functions";
import { listServiceOrderMaterialAttachments } from "@/lib/api/serviceOrderMaterialAttachments.functions";
import { ServiceOrderReportDocument } from "@/components/reports/print/ServiceOrderReportDocument";
import { downloadServiceOrderReportPdf } from "@/lib/reports/serviceOrderDownload";
import { extractTotalLiquidoFromPdf } from "@/lib/reports/materialsTotalExtractor";
import { useAuth } from "@/components/app/AuthContext";
import { RequireAdmin } from "@/lib/auth/requireAdmin";

export const Route = createFileRoute("/_app/ordens/$id/imprimir")({
  head: ({ params }) => ({ meta: [{ title: `OS #${params.id} — Relatório` }] }),
  staticData: { hideBottomNav: true },
  component: () => (
    <RequireAdmin>
      <PrintOSPage />
    </RequireAdmin>
  ),
});

function PrintOSPage() {
  return (
    <div className="min-h-dvh bg-white p-3 sm:p-6 print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[900px] items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600">
          Pré-visualização do relatório da OS. Confira os dados antes de imprimir / salvar como PDF.
        </div>
        <Suspense fallback={null}>
          <PrintActions />
        </Suspense>
      </div>
      <div className="mx-auto max-w-[900px] rounded border border-slate-200 bg-white p-4 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <Suspense fallback={<p className="text-sm text-slate-500">Carregando dados…</p>}>
          <Body />
        </Suspense>
      </div>
    </div>
  );
}

function PrintActions() {
  const { id } = Route.useParams();
  const { displayName } = useAuth();
  const orderFn = useServerFn(getServiceOrder);
  const finFn = useServerFn(getOrderFinancials);
  const matFn = useServerFn(listServiceOrderMaterialAttachments);
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
  const { data: materials = [] } = useSuspenseQuery(
    queryOptions({
      queryKey: ["service-order-materials", id],
      queryFn: () => matFn({ data: { orderId: id } }),
    }),
  );
  const firstMaterial = materials.find((m) => m.signed_url) ?? null;
  const { data: materialsExtraction } = useQuery({
    queryKey: [
      "service-order-materials-net",
      id,
      firstMaterial?.file_path ?? null,
    ],
    enabled: Boolean(firstMaterial?.signed_url),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(firstMaterial!.signed_url!);
      if (!res.ok) return { cents: null as number | null };
      const buf = await res.arrayBuffer();
      const head = new Uint8Array(buf.slice(0, 5));
      const isPdf =
        head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
      if (!isPdf) return { cents: null as number | null };
      const r = await extractTotalLiquidoFromPdf(new Uint8Array(buf));
      return { cents: r.cents };
    },
  });
  const [downloading, setDownloading] = useState(false);
  if (!order) return null;
  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadServiceOrderReportPdf({
        order,
        entries: fin.entries,
        financials: fin.financials,
        generatedAt: new Date(),
        authorName: displayName ?? null,
        materials: materials
          .map((m) => m.signed_url)
          .filter((u): u is string => Boolean(u)),
        materialsNetCents: firstMaterial
          ? (materialsExtraction?.cents ?? null)
          : undefined,
        materialsFileName: firstMaterial?.file_name ?? undefined,
      });
      toast.success(`PDF da OS #${order.number} baixado`);
    } catch (error) {
      console.error("Failed to download OS PDF", error);
      toast.error("Não foi possível baixar o PDF da OS.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={handleDownload} disabled={downloading} className="gap-2">
        {downloading ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
        {downloading ? "Gerando…" : "Baixar PDF"}
      </Button>
      <Button onClick={() => window.print()} className="gap-2">
        <Printer size={15} /> Imprimir / Salvar PDF
      </Button>
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
