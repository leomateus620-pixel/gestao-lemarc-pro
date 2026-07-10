import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportLookupsQuery } from "@/hooks/useReports";
import { useIsMobile } from "@/hooks/use-mobile";
import { PERIOD_OPTIONS } from "@/lib/reports/filters";
import type { PeriodKey } from "@/types/reports";

export function ClientReportDrawer() {
  const lookups = useReportLookupsQuery();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const isMobile = useIsMobile();

  function go() {
    if (!clientId) return;
    navigate({
      to: "/relatorios/cliente/$clientId",
      params: { clientId },
      search: { period },
    });
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto">
          <FileText size={16} />
          Relatório por cliente
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          "flex w-full flex-col border-white/10 bg-[#101a29] p-0 text-foreground " +
          (isMobile ? "max-h-[82dvh] rounded-t-[1.5rem]" : "h-full max-w-md")
        }
      >
        <SheetHeader className="border-b border-white/10 px-5 pb-4 pt-5 text-left">
          <SheetTitle className="font-display text-white">Gerar relatório por cliente</SheetTitle>
          <SheetDescription className="pr-8 text-xs leading-relaxed text-slate-300/82">
            Escolha o cliente e o período para abrir o detalhamento operacional.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
              Cliente
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="lemarc-report-control mt-1.5 h-11 rounded-xl font-semibold">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {lookups.data.clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
              Período
            </Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="lemarc-report-control mt-1.5 h-11 rounded-xl font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SheetFooter className="border-t border-white/10 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:pb-5">
          <Button
            className="lemarc-report-action-primary h-11 w-full rounded-xl font-black"
            disabled={!clientId}
            onClick={go}
          >
            Abrir relatório
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
