import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
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
import { PERIOD_OPTIONS } from "@/lib/reports/filters";
import type { PeriodKey } from "@/types/reports";

export function ClientReportDrawer() {
  const lookups = useReportLookupsQuery();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [period, setPeriod] = useState<PeriodKey>("month");

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
        <Button className="h-10 gap-2 lemarc-orange-glow">
          <FileText size={16} />
          Relatório por cliente
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle>Gerar relatório por cliente</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Cliente
            </Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1.5 h-10 bg-secondary/50">
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
            <Label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              Período
            </Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="mt-1.5 h-10 bg-secondary/50">
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
        <SheetFooter className="mt-6">
          <Button className="w-full" disabled={!clientId} onClick={go}>
            Abrir relatório
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}