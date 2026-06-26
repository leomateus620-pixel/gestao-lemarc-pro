import { Suspense, useMemo, useState } from "react";
import { FileDown, Loader2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ReportFilters, PeriodKey, BillingStatus } from "@/types/reports";
import { billingStatusLabel } from "@/types/reports";
import {
  priorityLabel,
  serviceTypeLabel,
  statusLabel,
  type ServiceOrderStatus,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import { useReportLookupsQuery, useReportOrdersQuery } from "@/hooks/useReports";
import { formatCurrency, formatNumber } from "@/lib/reports/formatters";
import { buildManagerialReport, describePeriod } from "@/lib/reports/managerial";
import { downloadManagerialReportPdf } from "@/lib/reports/managerialDownload";
import { useAuth } from "@/components/app/AuthContext";
import { reportSearchSchema, searchToFilters } from "@/lib/reports/filters";

const STATUS_KEYS = Object.keys(statusLabel) as ServiceOrderStatus[];
const PRIORITY_KEYS = Object.keys(priorityLabel) as ServicePriority[];
const TYPE_KEYS = Object.keys(serviceTypeLabel) as ServiceType[];
const BILLING_KEYS = Object.keys(billingStatusLabel) as BillingStatus[];
const ALL = "__all__";

const QUICK_PERIODS: { key: PeriodKey; label: string; hint: string }[] = [
  { key: "today", label: "Hoje", hint: "OS do dia" },
  { key: "week", label: "Semana atual", hint: "Últimos 7 dias" },
  { key: "month", label: "Mês atual", hint: "Últimos 30 dias" },
  { key: "last30", label: "Últimos 30 dias", hint: "Janela móvel" },
  { key: "custom", label: "Personalizado", hint: "Escolha datas" },
];

function defaultFilters(): ReportFilters {
  return {
    period: "month",
    from: null,
    to: null,
    clientId: null,
    unitId: null,
    technicianId: null,
    status: null,
    priority: null,
    serviceType: null,
    billingStatus: null,
    onlyWithRate: null,
    onlyCompleted: null,
    onlyAwaitingBilling: null,
    onlyWithObservations: null,
  };
}

function buildPrintUrl(f: ReportFilters): string {
  const sp = new URLSearchParams();
  sp.set("period", f.period);
  if (f.period === "custom") {
    if (f.from) sp.set("from", f.from);
    if (f.to) sp.set("to", f.to);
  }
  const opt = (k: string, v: string | boolean | null | undefined) => {
    if (v === null || v === undefined || v === "" || v === false) return;
    sp.set(k, String(v));
  };
  opt("clientId", f.clientId);
  opt("unitId", f.unitId);
  opt("technicianId", f.technicianId);
  opt("status", f.status);
  opt("priority", f.priority);
  opt("serviceType", f.serviceType);
  opt("billingStatus", f.billingStatus);
  opt("onlyWithRate", f.onlyWithRate);
  opt("onlyCompleted", f.onlyCompleted);
  opt("onlyAwaitingBilling", f.onlyAwaitingBilling);
  opt("onlyWithObservations", f.onlyWithObservations);
  return `/relatorios/imprimir?${sp.toString()}`;
}

export function ReportGenerateDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="lemarc-report-action h-11 w-full gap-2 rounded-xl px-4 font-black sm:w-auto">
          <FileDown size={16} /> Gerar relatório gerencial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] w-[96vw] max-w-3xl overflow-y-auto border-white/10 bg-[#101a29] p-0 text-foreground">
        <div className="flex flex-col">
          <DialogHeader className="border-b border-white/10 px-5 pb-3 pt-5">
            <DialogTitle className="font-display text-lg text-white">
              Relatório gerencial
            </DialogTitle>
            <DialogDescription className="text-slate-300/78">
              Selecione o período e os filtros. O PDF será gerado com dados reais do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogBody onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogBody({ onClose }: { onClose: () => void }) {
  const initialFilters = useMemo(() => {
    if (typeof window === "undefined") return defaultFilters();
    const raw = Object.fromEntries(new URLSearchParams(window.location.search).entries());
    return searchToFilters(reportSearchSchema.parse(raw));
  }, []);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const update = (patch: Partial<ReportFilters>) => setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-5 px-5 py-4">
      <PeriodPicker filters={filters} onChange={update} />
      <FiltersBlock filters={filters} onChange={update} />
      <PreviewBlock filters={filters} onClose={onClose} />
    </div>
  );
}

function PeriodPicker({
  filters,
  onChange,
}: {
  filters: ReportFilters;
  onChange: (p: Partial<ReportFilters>) => void;
}) {
  return (
    <section>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Período</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {QUICK_PERIODS.map((p) => {
          const active = filters.period === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange({ period: p.key })}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-left transition",
                active
                  ? "border-primary/55 bg-primary/15 text-primary shadow-lg"
                  : "border-white/10 bg-white/[0.055] text-slate-100 hover:bg-white/[0.08]",
              )}
            >
              <div className="text-xs font-black">{p.label}</div>
              <div className="mt-0.5 text-[10px] font-semibold text-slate-300/76">{p.hint}</div>
            </button>
          );
        })}
      </div>
      {filters.period === "custom" && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-[11px]">Data inicial</Label>
            <Input
              className="lemarc-report-control mt-1 h-10 rounded-xl"
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => onChange({ from: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-[11px]">Data final</Label>
            <Input
              className="lemarc-report-control mt-1 h-10 rounded-xl"
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => onChange({ to: e.target.value || null })}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function FiltersBlock({
  filters,
  onChange,
}: {
  filters: ReportFilters;
  onChange: (p: Partial<ReportFilters>) => void;
}) {
  const { data: lookups } = useReportLookupsQuery();
  const units = useMemo(
    () =>
      filters.clientId
        ? lookups.units.filter((u) => u.client_id === filters.clientId)
        : lookups.units,
    [filters.clientId, lookups.units],
  );

  return (
    <section className="space-y-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Filtros</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label="Cliente"
          value={filters.clientId ?? ALL}
          onChange={(v) => onChange({ clientId: v === ALL ? null : v, unitId: null })}
          options={[
            { value: ALL, label: "Todos" },
            ...lookups.clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SelectField
          label="Unidade"
          value={filters.unitId ?? ALL}
          onChange={(v) => onChange({ unitId: v === ALL ? null : v })}
          options={[
            { value: ALL, label: "Todas" },
            ...units.map((u) => ({ value: u.id, label: u.name })),
          ]}
          disabled={units.length === 0}
        />
        <SelectField
          label="Técnico"
          value={filters.technicianId ?? ALL}
          onChange={(v) => onChange({ technicianId: v === ALL ? null : v })}
          options={[
            { value: ALL, label: "Todos" },
            ...lookups.technicians.map((t) => ({ value: t.id, label: t.full_name })),
          ]}
        />
        <SelectField
          label="Status"
          value={filters.status ?? ALL}
          onChange={(v) => onChange({ status: v === ALL ? null : (v as ServiceOrderStatus) })}
          options={[
            { value: ALL, label: "Todos" },
            ...STATUS_KEYS.map((k) => ({ value: k, label: statusLabel[k] })),
          ]}
        />
        <SelectField
          label="Prioridade"
          value={filters.priority ?? ALL}
          onChange={(v) => onChange({ priority: v === ALL ? null : (v as ServicePriority) })}
          options={[
            { value: ALL, label: "Todas" },
            ...PRIORITY_KEYS.map((k) => ({ value: k, label: priorityLabel[k] })),
          ]}
        />
        <SelectField
          label="Tipo de serviço"
          value={filters.serviceType ?? ALL}
          onChange={(v) => onChange({ serviceType: v === ALL ? null : (v as ServiceType) })}
          options={[
            { value: ALL, label: "Todos" },
            ...TYPE_KEYS.map((k) => ({ value: k, label: serviceTypeLabel[k] })),
          ]}
        />
        <SelectField
          label="Cobrança"
          value={filters.billingStatus ?? ALL}
          onChange={(v) => onChange({ billingStatus: v === ALL ? null : (v as BillingStatus) })}
          options={[
            { value: ALL, label: "Todas" },
            ...BILLING_KEYS.map((k) => ({ value: k, label: billingStatusLabel[k] })),
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Toggle
          checked={!!filters.onlyCompleted}
          onChange={(v) => onChange({ onlyCompleted: v ? true : null })}
          label="Somente OS concluídas"
        />
        <Toggle
          checked={!!filters.onlyAwaitingBilling}
          onChange={(v) => onChange({ onlyAwaitingBilling: v ? true : null })}
          label="Somente aguardando cobrança"
        />
        <Toggle
          checked={!!filters.onlyWithObservations}
          onChange={(v) => onChange({ onlyWithObservations: v ? true : null })}
          label="Somente OS com observações"
        />
        <Toggle
          checked={!!filters.onlyWithRate}
          onChange={(v) => onChange({ onlyWithRate: v ? true : null })}
          label="Somente OS com valor/hora"
        />
      </div>
    </section>
  );
}

function SelectField({
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
        <SelectTrigger className="lemarc-report-control mt-1.5 h-10 rounded-xl font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
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

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/[0.08]">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span>{label}</span>
    </label>
  );
}

function PreviewBlock({ filters, onClose }: { filters: ReportFilters; onClose: () => void }) {
  // Validate custom range
  const customInvalid =
    filters.period === "custom" &&
    filters.from &&
    filters.to &&
    new Date(filters.from) > new Date(filters.to);

  if (customInvalid) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        A data inicial não pode ser maior que a data final.
      </div>
    );
  }
  if (filters.period === "custom" && (!filters.from || !filters.to)) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3 text-xs font-semibold text-slate-300/82">
        Selecione a data inicial e final para visualizar a prévia.
      </div>
    );
  }

  return <PreviewLoader filters={filters} onClose={onClose} />;
}

function PreviewLoader({ filters, onClose }: { filters: ReportFilters; onClose: () => void }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] p-3 text-xs font-semibold text-slate-300/82">
          <Loader2 className="size-3.5 animate-spin" /> Carregando prévia…
        </div>
      }
    >
      <PreviewContent filters={filters} onClose={onClose} />
    </Suspense>
  );
}

function PreviewContent({ filters, onClose }: { filters: ReportFilters; onClose: () => void }) {
  const { data: rows } = useReportOrdersQuery(filters);
  const { displayName } = useAuth();
  const report = useMemo(() => buildManagerialReport(rows), [rows]);
  const periodLabel = describePeriod(filters);
  const empty = rows.length === 0;

  const handleGenerate = async () => {
    const generatedAt = new Date();
    await downloadManagerialReportPdf({
      report,
      periodLabel,
      generatedAt,
      authorName: displayName ?? null,
    });
  };

  const handlePreview = () => {
    const url = buildPrintUrl(filters);
    window.open(url, "_blank", "noopener");
    onClose();
  };

  return (
    <section className="space-y-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Prévia</div>
      <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3 shadow-inner">
        <div className="text-xs font-black text-white">{periodLabel}</div>
        {empty ? (
          <p className="mt-2 text-xs font-semibold text-slate-300/82">
            Nenhuma Ordem de Serviço encontrada para os filtros selecionados.
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Total OS" value={formatNumber(report.summary.totalOrders)} />
            <Stat label="Concluídas" value={formatNumber(report.summary.finished)} />
            <Stat label="Horas" value={`${report.summary.totalHours.toFixed(1)}h`} />
            <Stat label="Valor estimado" value={formatCurrency(report.summary.estimatedValue)} />
            <Stat label="Clientes" value={formatNumber(report.summary.clientsInvolved)} />
            <Stat label="Técnicos" value={formatNumber(report.summary.techniciansInvolved)} />
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="outline" className="lemarc-report-action rounded-xl" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="secondary"
          className="lemarc-report-action gap-2 rounded-xl"
          onClick={handlePreview}
        >
          <Printer size={15} /> Visualizar
        </Button>
        <Button
          onClick={handleGenerate}
          className="lemarc-report-action-primary gap-2 rounded-xl font-black"
        >
          <FileDown size={15} /> Baixar PDF
        </Button>
      </DialogFooter>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-black text-white">{value}</div>
    </div>
  );
}
