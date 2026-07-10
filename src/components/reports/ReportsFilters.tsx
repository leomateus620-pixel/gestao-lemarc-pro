import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, Filter, RotateCcw, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  getPeriodLabel,
  isCustomRangeInvalid,
  resetReportFilters,
} from "@/lib/reports/filters";
import type { BillingStatus, ReportFilters } from "@/types/reports";
import { billingStatusLabel } from "@/types/reports";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrderStatus,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import { useReportLookupsQuery } from "@/hooks/useReports";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const STATUS_KEYS = Object.keys(statusLabel) as ServiceOrderStatus[];
const PRIORITY_KEYS = Object.keys(priorityLabel) as ServicePriority[];
const TYPE_KEYS = Object.keys(serviceTypeLabel) as ServiceType[];
const BILLING_KEYS = Object.keys(billingStatusLabel) as BillingStatus[];
const ALL = "__all__";

type Patch = Partial<ReportFilters>;

function useRouteSetter(routePath: "/relatorios" | "/relatorios/cliente/$clientId") {
  const navigate = useNavigate();
  return (patch: Patch) =>
    navigate({
      to: routePath,
      params: ((prev: Record<string, unknown>) => prev) as never,
      search: ((prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev, ...patch };
        for (const key of Object.keys(next)) {
          const value = next[key];
          if (value === null || value === undefined || value === "" || value === false) {
            delete next[key];
          }
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
  routePath: "/relatorios" | "/relatorios/cliente/$clientId";
  hideClient?: boolean;
}) {
  const setSearch = useRouteSetter(routePath);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const active = countActiveFilters(filters);
  const lookups = useReportLookupsQuery();
  const customInvalid = isCustomRangeInvalid(filters);

  const units = useMemo(() => {
    if (!filters.clientId) return lookups.data.units;
    return lookups.data.units.filter((unit) => unit.client_id === filters.clientId);
  }, [filters.clientId, lookups.data.units]);

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    const client = lookups.data.clients.find((item) => item.id === filters.clientId);
    const unit = lookups.data.units.find((item) => item.id === filters.unitId);
    const technician = lookups.data.technicians.find((item) => item.id === filters.technicianId);
    if (client) labels.push(client.name);
    if (unit) labels.push(unit.name);
    if (technician) labels.push(technician.full_name);
    if (filters.status) labels.push(statusLabel[filters.status]);
    if (filters.priority) labels.push(priorityLabel[filters.priority]);
    if (filters.serviceType) labels.push(serviceTypeLabel[filters.serviceType]);
    if (filters.billingStatus) labels.push(billingStatusLabel[filters.billingStatus]);
    if (filters.onlyWithRate) labels.push("Com valor/hora");
    if (filters.onlyCompleted) labels.push("Concluídas");
    if (filters.onlyAwaitingBilling) labels.push("Aguardando cobrança");
    if (filters.onlyWithObservations) labels.push("Com observações");
    return labels;
  }, [filters, lookups.data]);

  const clearFilters = () => setSearch(resetReportFilters(filters, hideClient));

  return (
    <section aria-labelledby="report-filter-title" className="min-w-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div id="report-filter-title" className="lemarc-report-field-label">
            Período analisado
          </div>
          <div className="mt-1.5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select
              value={filters.period}
              onValueChange={(value) =>
                setSearch({ period: value as ReportFilters["period"], from: null, to: null })
              }
            >
              <SelectTrigger
                className="lemarc-report-control h-11 w-full rounded-xl font-bold sm:w-[190px]"
                aria-label="Selecionar período"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filters.period === "custom" && (
              <div className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                <DateField
                  id="report-date-from"
                  label="Data inicial"
                  value={filters.from ?? ""}
                  onChange={(value) => setSearch({ from: value || null })}
                />
                <DateField
                  id="report-date-to"
                  label="Data final"
                  value={filters.to ?? ""}
                  onChange={(value) => setSearch({ to: value || null })}
                />
              </div>
            )}
          </div>
          {customInvalid && (
            <p className="mt-1.5 text-xs font-bold text-destructive" role="alert">
              A data inicial não pode ser posterior à data final.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2 min-[360px]:flex-row lg:justify-end">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                className={cn(
                  "lemarc-report-action h-11 min-h-11 min-w-0 flex-1 gap-2 rounded-xl px-4 font-black lg:flex-none",
                  active > 0 && "border-primary/45 text-primary",
                )}
                aria-label={
                  active > 0
                    ? `Abrir filtros avançados, ${active} ativos`
                    : "Abrir filtros avançados"
                }
              >
                <Filter size={15} aria-hidden="true" />
                <span className="truncate">Filtros avançados</span>
                {active > 0 && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                    {active}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isMobile ? "bottom" : "right"}
              className={cn(
                "flex overflow-hidden border-white/10 bg-[#101a29] p-0 text-foreground",
                isMobile
                  ? "max-h-[88dvh] w-full flex-col rounded-t-[1.5rem]"
                  : "h-full w-full max-w-md flex-col",
              )}
            >
              <SheetHeader className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5 text-left">
                <SheetTitle className="font-display text-lg text-white">
                  Filtros avançados
                </SheetTitle>
                <SheetDescription className="pr-8 text-xs leading-relaxed text-slate-300/82">
                  Refine os dados do período. Cada alteração atualiza o relatório automaticamente.
                </SheetDescription>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
                {!hideClient && (
                  <FilterSelect
                    label="Cliente"
                    value={filters.clientId ?? ALL}
                    onChange={(value) =>
                      setSearch({ clientId: value === ALL ? null : value, unitId: null })
                    }
                    options={lookups.data.clients.map((client) => ({
                      value: client.id,
                      label: client.name,
                    }))}
                  />
                )}
                <FilterSelect
                  label="Unidade"
                  value={filters.unitId ?? ALL}
                  onChange={(value) => setSearch({ unitId: value === ALL ? null : value })}
                  options={units.map((unit) => ({ value: unit.id, label: unit.name }))}
                  disabled={!units.length}
                />
                <FilterSelect
                  label="Técnico ou colaborador"
                  value={filters.technicianId ?? ALL}
                  onChange={(value) => setSearch({ technicianId: value === ALL ? null : value })}
                  options={lookups.data.technicians.map((technician) => ({
                    value: technician.id,
                    label: technician.full_name,
                  }))}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FilterSelect
                    label="Status da OS"
                    value={filters.status ?? ALL}
                    onChange={(value) =>
                      setSearch({
                        status: value === ALL ? null : (value as ServiceOrderStatus),
                      })
                    }
                    options={STATUS_KEYS.map((key) => ({ value: key, label: statusLabel[key] }))}
                  />
                  <FilterSelect
                    label="Cobrança"
                    value={filters.billingStatus ?? ALL}
                    onChange={(value) =>
                      setSearch({
                        billingStatus: value === ALL ? null : (value as BillingStatus),
                      })
                    }
                    options={BILLING_KEYS.map((key) => ({
                      value: key,
                      label: billingStatusLabel[key],
                    }))}
                  />
                  <FilterSelect
                    label="Prioridade"
                    value={filters.priority ?? ALL}
                    onChange={(value) =>
                      setSearch({
                        priority: value === ALL ? null : (value as ServicePriority),
                      })
                    }
                    options={PRIORITY_KEYS.map((key) => ({
                      value: key,
                      label: priorityLabel[key],
                    }))}
                  />
                  <FilterSelect
                    label="Tipo de serviço"
                    value={filters.serviceType ?? ALL}
                    onChange={(value) =>
                      setSearch({
                        serviceType: value === ALL ? null : (value as ServiceType),
                      })
                    }
                    options={TYPE_KEYS.map((key) => ({
                      value: key,
                      label: serviceTypeLabel[key],
                    }))}
                  />
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <div className="lemarc-report-field-label">Condições adicionais</div>
                  <FilterToggle
                    id="filter-with-rate"
                    checked={!!filters.onlyWithRate}
                    onChange={(checked) => setSearch({ onlyWithRate: checked ? true : null })}
                    label="Somente OS com valor/hora"
                    helper="Mostra ordens com precificação cadastrada."
                  />
                  <FilterToggle
                    id="filter-completed"
                    checked={!!filters.onlyCompleted}
                    onChange={(checked) => setSearch({ onlyCompleted: checked ? true : null })}
                    label="Somente OS concluídas"
                    helper="Inclui ordens finalizadas ou aprovadas."
                  />
                  <FilterToggle
                    id="filter-awaiting-billing"
                    checked={!!filters.onlyAwaitingBilling}
                    onChange={(checked) =>
                      setSearch({ onlyAwaitingBilling: checked ? true : null })
                    }
                    label="Somente aguardando cobrança"
                    helper="Prioriza ordens prontas para conferência financeira."
                  />
                  <FilterToggle
                    id="filter-with-observations"
                    checked={!!filters.onlyWithObservations}
                    onChange={(checked) =>
                      setSearch({ onlyWithObservations: checked ? true : null })
                    }
                    label="Somente OS com observações"
                    helper="Mostra registros com descrição operacional."
                  />
                </div>
              </div>

              <SheetFooter className="shrink-0 flex-row gap-2 border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 sm:px-5 sm:pb-5">
                <Button
                  type="button"
                  variant="ghost"
                  className="lemarc-report-action h-11 flex-1 rounded-xl"
                  onClick={clearFilters}
                  disabled={active === 0}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Limpar
                </Button>
                <Button
                  type="button"
                  className="lemarc-report-action-primary h-11 flex-1 rounded-xl font-black"
                  onClick={() => setOpen(false)}
                >
                  Ver resultados
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {active > 0 && (
            <Button
              variant="ghost"
              className="h-11 min-h-11 min-w-0 flex-1 gap-1.5 rounded-xl px-3 text-xs font-black text-slate-300 hover:text-white lg:flex-none"
              onClick={clearFilters}
            >
              <X size={14} aria-hidden="true" />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      <div
        className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-white/[0.08] pt-3"
        aria-live="polite"
      >
        <span className="lemarc-report-filter-chip lemarc-report-filter-chip--period">
          <CalendarDays size={13} aria-hidden="true" />
          {getPeriodLabel(filters.period)}
        </span>
        {activeLabels.slice(0, 4).map((label) => (
          <span key={label} className="lemarc-report-filter-chip max-w-full" title={label}>
            <span className="truncate">{label}</span>
          </span>
        ))}
        {activeLabels.length > 4 && (
          <span className="lemarc-report-filter-chip">+{activeLabels.length - 4}</span>
        )}
        <span className="ml-auto text-[11px] font-bold text-slate-300/78">
          {active === 0
            ? "Sem filtros adicionais"
            : `${active} filtro${active === 1 ? "" : "s"} ativo${active === 1 ? "" : "s"}`}
        </span>
      </div>
    </section>
  );
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        aria-label={label}
        className="lemarc-report-control h-11 min-w-0 rounded-xl px-3 font-semibold"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <Label className="lemarc-report-field-label">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="lemarc-report-control mt-1.5 h-11 min-w-0 rounded-xl font-semibold">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL}>Todos</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterToggle({
  id,
  checked,
  onChange,
  label,
  helper,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  helper: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs font-black leading-snug text-white">
          {label}
        </Label>
        <p className="mt-0.5 text-[11px] font-semibold leading-snug text-slate-300/78">{helper}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
