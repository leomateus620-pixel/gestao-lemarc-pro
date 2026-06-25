import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  PERIOD_OPTIONS,
  countActiveFilters,
  isCustomRangeInvalid,
} from "@/lib/reports/filters";
import type { ReportFilters, BillingStatus } from "@/types/reports";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrderStatus,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import { useReportLookupsQuery } from "@/hooks/useReports";
import { billingStatusLabel } from "@/types/reports";
import { cn } from "@/lib/utils";

const STATUS_KEYS = Object.keys(statusLabel) as ServiceOrderStatus[];
const PRIORITY_KEYS = Object.keys(priorityLabel) as ServicePriority[];
const TYPE_KEYS = Object.keys(serviceTypeLabel) as ServiceType[];
const BILLING_KEYS = Object.keys(billingStatusLabel) as BillingStatus[];

const ALL = "__all__";

type Patch = Partial<ReportFilters>;

function useRouteSetter(routePath: "/_app/relatorios" | "/_app/relatorios/cliente/$clientId") {
  const navigate = useNavigate();
  return (patch: Patch) =>
    navigate({
      to: routePath,
      params: (prev) => prev as never,
      search: ((prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev, ...patch };
        for (const k of Object.keys(next)) {
          const v = next[k];
          if (v === null || v === undefined || v === "" || v === false) delete next[k];
        }
        return next;
      }) as never,
      replace: true,
    });
}

export function ReportsFilters({
  filters,
  routePath,
  hideClient = false,
}: {
  filters: ReportFilters;
  routePath: "/_app/relatorios" | "/_app/relatorios/cliente/$clientId";
  hideClient?: boolean;
}) {
  const setSearch = useRouteSetter(routePath);
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(filters);
  const lookups = useReportLookupsQuery();
  const customInvalid = isCustomRangeInvalid(filters);

  const units = useMemo(() => {
    if (!filters.clientId) return lookups.data.units;
    return lookups.data.units.filter((u) => u.client_id === filters.clientId);
  }, [filters.clientId, lookups.data.units]);

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        value={filters.period}
        onValueChange={(v) => setSearch({ period: v as ReportFilters["period"] })}
      >
        <SelectTrigger className="lemarc-report-control h-11 w-full rounded-xl font-bold sm:w-[156px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.period === "custom" && (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              type="date"
              className="lemarc-report-control h-11 w-full rounded-xl font-semibold sm:w-[150px]"
              value={filters.from ?? ""}
              onChange={(e) => setSearch({ from: e.target.value || null })}
            />
            <Input
              type="date"
              className="lemarc-report-control h-11 w-full rounded-xl font-semibold sm:w-[150px]"
              value={filters.to ?? ""}
              onChange={(e) => setSearch({ to: e.target.value || null })}
            />
          </div>
          {customInvalid && (
            <p className="text-[11px] font-bold text-destructive">
              Período inválido. Verifique a data inicial e final.
            </p>
          )}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="secondary"
            className={cn(
              "lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto",
              active > 0 && "border-primary/45 text-primary",
            )}
          >
            <Filter size={15} />
            Filtros
            {active > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                {active}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-full max-w-md overflow-y-auto border-white/10 bg-[#101a29] text-foreground"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-white">Filtros do relatório</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {!hideClient && (
              <FilterSelect
                label="Cliente"
                value={filters.clientId ?? ALL}
                onChange={(v) => setSearch({ clientId: v === ALL ? null : v, unitId: null })}
                options={lookups.data.clients.map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
            <FilterSelect
              label="Unidade"
              value={filters.unitId ?? ALL}
              onChange={(v) => setSearch({ unitId: v === ALL ? null : v })}
              options={units.map((u) => ({ value: u.id, label: u.name }))}
              disabled={!units.length}
            />
            <FilterSelect
              label="Técnico"
              value={filters.technicianId ?? ALL}
              onChange={(v) => setSearch({ technicianId: v === ALL ? null : v })}
              options={lookups.data.technicians.map((t) => ({
                value: t.id,
                label: t.full_name,
              }))}
            />
            <FilterSelect
              label="Status"
              value={filters.status ?? ALL}
              onChange={(v) => setSearch({ status: v === ALL ? null : (v as ServiceOrderStatus) })}
              options={STATUS_KEYS.map((k) => ({ value: k, label: statusLabel[k] }))}
            />
            <FilterSelect
              label="Prioridade"
              value={filters.priority ?? ALL}
              onChange={(v) => setSearch({ priority: v === ALL ? null : (v as ServicePriority) })}
              options={PRIORITY_KEYS.map((k) => ({ value: k, label: priorityLabel[k] }))}
            />
            <FilterSelect
              label="Tipo de serviço"
              value={filters.serviceType ?? ALL}
              onChange={(v) => setSearch({ serviceType: v === ALL ? null : (v as ServiceType) })}
              options={TYPE_KEYS.map((k) => ({ value: k, label: serviceTypeLabel[k] }))}
            />
            <FilterSelect
              label="Cobrança"
              value={filters.billingStatus ?? ALL}
              onChange={(v) =>
                setSearch({ billingStatus: v === ALL ? null : (v as BillingStatus) })
              }
              options={BILLING_KEYS.map((k) => ({ value: k, label: billingStatusLabel[k] }))}
            />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.055] p-3">
              <div>
                <Label className="text-xs font-black text-white">Somente OS com valor/hora</Label>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-300/78">
                  Esconde OS sem hour_rate configurado.
                </p>
              </div>
              <Switch
                checked={!!filters.onlyWithRate}
                onCheckedChange={(v) => setSearch({ onlyWithRate: v ? true : null })}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              className="lemarc-report-action flex-1 rounded-xl"
              onClick={() =>
                setSearch({
                  period: "month",
                  from: null,
                  to: null,
                  clientId: hideClient ? filters.clientId : null,
                  unitId: null,
                  technicianId: null,
                  status: null,
                  priority: null,
                  serviceType: null,
                  billingStatus: null,
                  onlyWithRate: null,
                })
              }
            >
              Limpar tudo
            </Button>
            <Button
              type="button"
              className="lemarc-report-action-primary flex-1 rounded-xl font-black"
              onClick={() => setOpen(false)}
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {active > 0 && (
        <Button
          variant="ghost"
          className="h-11 w-full gap-1.5 rounded-xl text-xs font-black text-slate-300 hover:text-white sm:w-auto"
          onClick={() =>
            setSearch({
              period: "month",
              from: null,
              to: null,
              clientId: hideClient ? filters.clientId : null,
              unitId: null,
              technicianId: null,
              status: null,
              priority: null,
              serviceType: null,
              billingStatus: null,
              onlyWithRate: null,
            })
          }
        >
          <X size={14} />
          Limpar
        </Button>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="lemarc-report-control mt-1.5 h-11 rounded-xl font-semibold">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
