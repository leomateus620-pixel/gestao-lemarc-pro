import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calculator,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  Info,
  ListChecks,
  Loader2,
  MapPinned,
  Plus,
  ReceiptText,
  Trash2,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  computeDurationMinutes,
  computeSubtotalCents,
  computeDisplacementCents,
  computeTotals,
  describeDisplacement,
  formatBRL,
  formatHHmm,
  parseBRLToCents,
} from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { finalizeServiceOrder, getOrderFinancials } from "@/lib/api/financials.functions";
import { listTimeSessions } from "@/lib/api/timeSessions.functions";
import { computeClosedWorkedMinutesByTech } from "@/lib/serviceOrders/timeSessions";
import type { DisplacementInput, DisplacementType, LaborEntryInput } from "@/types/financials";
import type { ServiceOrder } from "@/types/serviceOrder";
import { SignatureCaptureDialog } from "@/components/ordens/signature/SignatureCaptureDialog";

type Props = {
  order: ServiceOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DraftEntry = LaborEntryInput & {
  uid: string;
  rate_input: string;
  error?: string | null;
};

const ROLE_OPTIONS = ["Técnico", "Auxiliar", "Responsável", "Apoio"];

type StepIndex = 0 | 1 | 2;

type ComputedDraftEntry = DraftEntry & {
  duration_minutes: number;
  subtotal_cents: number;
  error: string | null;
};

type StepItem = {
  i: StepIndex;
  label: string;
  helper: string;
  icon: LucideIcon;
};

const STEP_ITEMS: StepItem[] = [
  { i: 0, label: "Apontamentos", helper: "Horas e técnico", icon: ListChecks },
  { i: 1, label: "Deslocamento", helper: "Custo de visita", icon: Truck },
  { i: 2, label: "Revisão", helper: "Confirmação final", icon: Check },
];

const CONTROL_CLASS =
  "h-10 rounded-lg border-white/15 bg-white/[0.07] text-sm text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors placeholder:text-slate-500 focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/25";

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-white/15 bg-[#141f31] px-3 text-sm font-semibold text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition-colors focus:border-primary/70 focus:ring-2 focus:ring-primary/25";

const LABEL_CLASS = "text-[0.68rem] font-black uppercase tracking-[0.08em] text-slate-300";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO() {
  const d = new Date();
  const tz = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return tz; // YYYY-MM-DD
}

function timeFromIso(iso: string | null | undefined): string {
  if (!iso) return "08:00";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "08:00";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function dateFromIso(iso: string | null | undefined): string {
  if (!iso) return todayISO();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayISO();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addMinutesToHm(hm: string, minutes: number): string {
  const [h, m] = hm.split(":").map(Number);
  const total =
    (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0) + Math.max(0, minutes);
  const capped = Math.min(23 * 60 + 59, total);
  const hh = Math.floor(capped / 60)
    .toString()
    .padStart(2, "0");
  const mm = (capped % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function shortName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function formatDateBR(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function isAutoCalculatedEntry(entry: DraftEntry) {
  return entry.description === "Calculado automaticamente pelo controle de tempo";
}

function buildUnitDisplacementHint(order: ServiceOrder) {
  const unit = order.client_unit;
  if (!unit) return null;

  const parts: string[] = [];
  if (unit.default_displacement_type === "km") parts.push("cobrança por km");
  if (unit.default_displacement_type === "fixed") parts.push("valor fixo cadastrado");
  if (unit.default_displacement_type === "none") parts.push("sem cobrança padrão");
  if (unit.default_displacement_rate_cents != null) {
    parts.push(`${formatBRL(unit.default_displacement_rate_cents)} por km`);
  }
  if (unit.distance_km_from_base != null) {
    parts.push(`${unit.distance_km_from_base.toLocaleString("pt-BR")} km da base`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function displacementOptionCopy(type: DisplacementType) {
  if (type === "none") {
    return {
      title: "Sem deslocamento",
      helper: "Não adiciona custo à OS",
      icon: BadgeCheck,
    };
  }
  if (type === "per_km") {
    return {
      title: "Por km",
      helper: "Km total multiplicado pelo valor/km",
      icon: MapPinned,
    };
  }
  return {
    title: "Valor fixo",
    helper: "Cobrança única combinada",
    icon: CircleDollarSign,
  };
}

function FieldGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className={LABEL_CLASS}>{label}</Label>
      {children}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 font-display text-sm font-black tabular-nums text-slate-50">
        {value}
      </div>
    </div>
  );
}

function StepIntro({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-[0_12px_24px_-18px_rgba(255,153,51,0.85)]">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-base font-black leading-tight text-slate-50">{title}</h3>
        <div className="mt-1 text-sm leading-5 text-slate-300">{children}</div>
      </div>
    </div>
  );
}

function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "danger";
  children: ReactNode;
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-300/35 bg-amber-400/10 text-amber-100"
      : tone === "danger"
        ? "border-rose-300/35 bg-rose-400/10 text-rose-100"
        : "border-sky-300/25 bg-sky-400/10 text-sky-100";
  const Icon = tone === "info" ? Info : AlertTriangle;

  return (
    <div className={cn("flex gap-2 rounded-xl border p-3 text-xs leading-5", toneClass)}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl px-3 py-2.5",
        strong ? "bg-primary/12 text-primary" : "bg-white/[0.045] text-slate-200",
      )}
    >
      <span className={cn("text-sm", strong && "font-black")}>{label}</span>
      <span
        className={cn(
          "text-right font-display font-black tabular-nums",
          strong ? "text-base sm:text-lg" : "text-sm text-slate-50",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function FinalizeServiceOrderDialog({ order, open, onOpenChange }: Props) {
  const techs = useMemo(() => getOrderTechnicians(order), [order]);
  const queryClient = useQueryClient();
  const fetcher = useServerFn(getOrderFinancials);
  const finalizeFn = useServerFn(finalizeServiceOrder);
  const sessionsFn = useServerFn(listTimeSessions);
  const hasSignature = Boolean(order.signature);
  const hasWaiver = Boolean(order.signature_waiver_reason);
  const signatureOk = hasSignature || hasWaiver;
  const [captureOpen, setCaptureOpen] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["order-financials", order.id],
    queryFn: () => fetcher({ data: { orderId: order.id } }),
    enabled: open,
    staleTime: 0,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["order-time-sessions", order.id],
    queryFn: () => sessionsFn({ data: { orderId: order.id } }),
    enabled: open,
    staleTime: 0,
  });

  const [step, setStep] = useState<StepIndex>(0);
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [displacement, setDisplacement] = useState<{
    type: DisplacementType;
    count: string;
    km_total: string;
    rate_input: string;
    fixed_input: string;
    notes: string;
  }>({
    type: "none",
    count: "",
    km_total: "",
    rate_input: "",
    fixed_input: "",
    notes: "",
  });
  const [generalNotes, setGeneralNotes] = useState("");

  // Hydrate when dialog opens.
  useEffect(() => {
    if (!open) return;
    const fallbackDate = dateFromIso(order.started_at ?? order.opened_at);
    const fallbackStart = timeFromIso(order.started_at ?? order.opened_at);
    const rawEnd = timeFromIso(order.finished_at ?? new Date().toISOString());
    // Nunca inventar horário de saída: se saída <= entrada, deixa igual à entrada
    // (duração 0) e obriga o técnico a ajustar antes de finalizar.
    const fallbackEnd = rawEnd > fallbackStart ? rawEnd : fallbackStart;
    const existingEntries = existing?.entries ?? [];

    if (existingEntries.length > 0) {
      setEntries(
        existingEntries.map((e: (typeof existingEntries)[number]) => ({
          uid: e.id,
          technician_id: e.technician_id ?? techs[0]?.id ?? "",
          role: e.role,
          work_date: e.work_date,
          start_time: e.start_time.slice(0, 5),
          end_time: e.end_time.slice(0, 5),
          hourly_rate_cents: e.hourly_rate_cents,
          rate_input: (e.hourly_rate_cents / 100).toFixed(2).replace(".", ","),
          description: e.description,
        })),
      );
    } else {
      // Prefer prefill from real time sessions (líquido, sem contar pausa).
      const workedByTech = computeClosedWorkedMinutesByTech(sessions);
      setEntries(
        techs.map((t) => {
          const minutes = workedByTech[t.id] ?? 0;
          const start = fallbackStart;
          const end = minutes > 0 ? addMinutesToHm(start, minutes) : fallbackEnd;
          return {
            uid: uid(),
            technician_id: t.id,
            role: t.assignment_role ?? null,
            work_date: fallbackDate,
            start_time: start,
            end_time: end,
            hourly_rate_cents: t.hourly_rate_cents ?? 0,
            rate_input:
              t.hourly_rate_cents != null
                ? (t.hourly_rate_cents / 100).toFixed(2).replace(".", ",")
                : "",
            description: minutes > 0 ? "Calculado automaticamente pelo controle de tempo" : null,
          };
        }),
      );
    }

    const f = existing?.financials;
    if (f) {
      setDisplacement({
        type: f.displacement_type,
        count: f.displacement_count ? String(f.displacement_count) : "",
        km_total: f.displacement_km_total ? String(f.displacement_km_total) : "",
        rate_input: f.displacement_rate_cents
          ? (f.displacement_rate_cents / 100).toFixed(2).replace(".", ",")
          : "",
        fixed_input:
          f.displacement_type === "fixed"
            ? (f.displacement_total_cents / 100).toFixed(2).replace(".", ",")
            : "",
        notes: f.displacement_notes ?? "",
      });
      setGeneralNotes(f.notes ?? "");
    }
    setStep(0);
  }, [open, existing, order, techs, sessions]);

  // Compute per-entry duration/subtotal preview.
  const computed: ComputedDraftEntry[] = entries.map((e) => {
    let duration = 0;
    let subtotal = 0;
    let err: string | null = null;
    try {
      duration = computeDurationMinutes(e.start_time, e.end_time);
      subtotal = computeSubtotalCents(duration, e.hourly_rate_cents);
    } catch (x) {
      err = (x as Error).message;
    }
    return { ...e, duration_minutes: duration, subtotal_cents: subtotal, error: err };
  });

  const displacementInput: DisplacementInput = {
    type: displacement.type,
    count: Number(displacement.count) || 0,
    km_total: Number(displacement.km_total.replace(",", ".")) || 0,
    rate_cents: parseBRLToCents(displacement.rate_input),
    fixed_total_cents: parseBRLToCents(displacement.fixed_input),
    notes: displacement.notes || null,
  };

  const totals = computeTotals(computed, displacementInput, 0);
  const displacementCents = computeDisplacementCents(displacementInput);
  const unitDisplacementHint = useMemo(() => buildUnitDisplacementHint(order), [order]);
  const hasAutoCalculatedEntries = computed.some(isAutoCalculatedEntry);

  const updateEntry = (i: number, patch: Partial<DraftEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const addEntry = (technicianId?: string) => {
    const tech = techs.find((t) => t.id === technicianId) ?? techs[0];
    if (!tech) return;
    const nowTime = timeFromIso(new Date().toISOString());
    setEntries((prev) => [
      ...prev,
      {
        uid: uid(),
        technician_id: tech.id,
        role: tech.assignment_role ?? null,
        work_date: todayISO(),
        start_time: nowTime,
        end_time: nowTime,
        hourly_rate_cents: tech.hourly_rate_cents ?? 0,
        rate_input:
          tech.hourly_rate_cents != null
            ? (tech.hourly_rate_cents / 100).toFixed(2).replace(".", ",")
            : "",
        description: null,
      },
    ]);
  };

  const removeEntry = (i: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Validation.
  const stepEntriesValid =
    entries.length > 0 &&
    computed.every((e) => !e.error && e.duration_minutes > 0 && e.technician_id);
  const stepRatesValid = computed.every((e) => e.hourly_rate_cents > 0);
  const stepDisplacementValid =
    displacement.type === "none" ||
    (displacement.type === "per_km" &&
      displacementInput.km_total > 0 &&
      displacementInput.rate_cents > 0) ||
    (displacement.type === "fixed" && displacementInput.fixed_total_cents > 0);

  const canGoToStep = (target: StepIndex) => {
    if (target <= step) return true;
    if (target === 1 && step === 0) return stepEntriesValid && stepRatesValid;
    if (target === 2 && step === 1) return stepDisplacementValid;
    return false;
  };

  const mutation = useMutation({
    mutationFn: () =>
      finalizeFn({
        data: {
          order_id: order.id,
          entries: entries.map((e) => ({
            technician_id: e.technician_id,
            role: e.role ?? null,
            work_date: e.work_date,
            start_time: e.start_time,
            end_time: e.end_time,
            hourly_rate_cents: parseBRLToCents(e.rate_input),
            description: e.description ?? null,
          })),
          displacement: displacementInput,
          materials_total_cents: 0,
          notes: generalNotes || null,
        },
      }),
    onSuccess: () => {
      toast.success("OS finalizada com apuração financeira");
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["order-financials", order.id] });
      queryClient.invalidateQueries({ queryKey: ["technician-labor-history"] });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["report-orders"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao finalizar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto flex h-[calc(100dvh-0.5rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-3xl border-white/15 bg-[#0b1321] p-0 text-slate-50 shadow-[0_-24px_70px_-32px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.16)] sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-[96vw] sm:max-w-[68rem] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl">
        <DialogHeader className="space-y-0 border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03)),radial-gradient(circle_at_100%_0%,rgba(255,153,51,0.16),transparent_34%)] px-4 pb-4 pt-5 text-left sm:px-6 sm:pb-5">
          <div className="flex min-w-0 items-start gap-3 pr-9">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary shadow-[0_16px_34px_-22px_rgba(255,153,51,0.9)]">
              <Calculator size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-display text-xl font-black leading-tight text-slate-50 sm:text-2xl">
                Apuração de horas e valores
              </DialogTitle>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-300">
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-black text-primary">
                  OS #{order.number}
                </span>
                <span className="min-w-0 truncate">
                  {order.client?.name ?? "Cliente não informado"}
                </span>
                {(order.client_unit?.name ?? order.client?.unit) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="min-w-0 truncate">
                      {order.client_unit?.name ?? order.client?.unit}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <nav className="border-b border-white/10 bg-[#0f1a2a]/95 px-4 py-3 sm:px-6">
          <ol className="grid grid-cols-3 gap-2">
            {STEP_ITEMS.map(({ i, label, helper, icon: Icon }) => {
              const active = step === i;
              const complete = step > i;
              const disabled = !canGoToStep(i);

              return (
                <li key={i} className="min-w-0">
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    disabled={disabled}
                    onClick={() => setStep(i)}
                    className={cn(
                      "flex h-full w-full min-w-0 items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition sm:px-3",
                      active
                        ? "border-primary/55 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_14px_28px_-24px_rgba(255,153,51,0.9)]"
                        : complete
                          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.035] text-slate-400",
                      disabled && "cursor-not-allowed opacity-55",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
                        active
                          ? "border-primary/40 bg-primary/18"
                          : complete
                            ? "border-emerald-300/25 bg-emerald-300/12"
                            : "border-white/10 bg-white/[0.04]",
                      )}
                    >
                      {complete ? <Check size={15} /> : <Icon size={15} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black sm:text-sm">{label}</span>
                      <span className="hidden truncate text-[0.68rem] font-semibold text-slate-400 sm:block">
                        {helper}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div key={step} className="lemarc-page-enter space-y-4 pb-2">
            {step === 0 && (
              <>
                <StepIntro icon={UserRound} title="Apontamentos dos técnicos">
                  Revise quem executou o serviço, o período trabalhado e o valor da hora antes de
                  avançar para a cobrança.
                </StepIntro>

                {techs.length === 0 && (
                  <Notice tone="warning">
                    Vincule ao menos um técnico à OS antes de finalizar.
                  </Notice>
                )}

                {hasAutoCalculatedEntries && (
                  <Notice>
                    <strong>Calculado pelo controle de tempo.</strong> A duração foi pré-preenchida
                    a partir das sessões encerradas da OS; ajuste os campos se houver diferença no
                    apontamento operacional.
                  </Notice>
                )}

                <div className="space-y-3">
                  {computed.map((entry, i) => {
                    const tech = techs.find((t) => t.id === entry.technician_id);
                    const autoCalculated = isAutoCalculatedEntry(entry);

                    return (
                      <article
                        key={entry.uid}
                        className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.028))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_42px_-34px_rgba(0,0,0,0.9)] sm:p-4"
                      >
                        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-primary">
                              <UserRound size={17} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-display text-base font-black text-slate-50">
                                {tech?.full_name ?? "Técnico"}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
                                <span>
                                  {entry.role || tech?.assignment_role || "Função não informada"}
                                </span>
                                {autoCalculated && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-0.5 text-[0.68rem] font-black text-sky-100">
                                    <Clock3 size={11} /> Calculado pelo controle de tempo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:justify-end">
                            <MetricPill
                              label="Tempo"
                              value={
                                entry.duration_minutes > 0
                                  ? formatHHmm(entry.duration_minutes)
                                  : "--:--"
                              }
                            />
                            <MetricPill label="Subtotal" value={formatBRL(entry.subtotal_cents)} />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeEntry(i)}
                              aria-label="Remover apontamento"
                              className="h-10 w-10 shrink-0 rounded-xl text-slate-400 hover:bg-rose-400/10 hover:text-rose-100"
                            >
                              <Trash2 size={15} />
                            </Button>
                          </div>
                        </header>

                        <div className="mt-4 grid gap-3 md:grid-cols-12">
                          <FieldGroup label="Técnico" className="md:col-span-4">
                            <select
                              className={SELECT_CLASS}
                              value={entry.technician_id}
                              onChange={(ev) => updateEntry(i, { technician_id: ev.target.value })}
                            >
                              {techs.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.full_name}
                                </option>
                              ))}
                            </select>
                          </FieldGroup>

                          <FieldGroup label="Função" className="md:col-span-3">
                            <select
                              className={SELECT_CLASS}
                              value={entry.role ?? ""}
                              onChange={(ev) => updateEntry(i, { role: ev.target.value || null })}
                            >
                              <option value="">Não informada</option>
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </FieldGroup>

                          <FieldGroup label="Data" className="md:col-span-2">
                            <Input
                              className={CONTROL_CLASS}
                              type="date"
                              value={entry.work_date}
                              onChange={(ev) => updateEntry(i, { work_date: ev.target.value })}
                            />
                          </FieldGroup>

                          <div className="grid grid-cols-2 gap-3 md:col-span-3">
                            <FieldGroup label="Entrada">
                              <Input
                                className={CONTROL_CLASS}
                                type="time"
                                value={entry.start_time}
                                onChange={(ev) => updateEntry(i, { start_time: ev.target.value })}
                              />
                            </FieldGroup>
                            <FieldGroup label="Saída">
                              <Input
                                className={CONTROL_CLASS}
                                type="time"
                                value={entry.end_time}
                                onChange={(ev) => updateEntry(i, { end_time: ev.target.value })}
                              />
                            </FieldGroup>
                          </div>

                          <FieldGroup label="Valor da hora" className="md:col-span-3">
                            <Input
                              className={cn(CONTROL_CLASS, "font-semibold tabular-nums")}
                              inputMode="decimal"
                              value={entry.rate_input}
                              placeholder="0,00"
                              onChange={(ev) => {
                                const txt = ev.target.value;
                                updateEntry(i, {
                                  rate_input: txt,
                                  hourly_rate_cents: parseBRLToCents(txt),
                                });
                              }}
                            />
                          </FieldGroup>

                          <FieldGroup
                            label="Descrição do serviço executado"
                            className="md:col-span-9"
                          >
                            <Textarea
                              className={cn(CONTROL_CLASS, "min-h-20 resize-none py-2")}
                              value={entry.description ?? ""}
                              onChange={(ev) =>
                                updateEntry(i, { description: ev.target.value || null })
                              }
                              placeholder="Ex.: troca de rolamento da bomba 03"
                            />
                          </FieldGroup>
                        </div>

                        {entry.error && (
                          <div className="mt-3">
                            <Notice tone="danger">{entry.error}</Notice>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.03] p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-display text-sm font-black text-slate-50">
                        Lançar novo apontamento
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Use quando houver outro período ou técnico na mesma OS.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {techs.map((t) => (
                        <Button
                          key={t.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => addEntry(t.id)}
                          className="lemarc-secondary-action h-9"
                        >
                          <Plus size={13} /> Lançar para {shortName(t.full_name)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {!stepRatesValid && (
                  <Notice tone="warning">
                    Informe o valor da hora de todos os técnicos antes de finalizar.
                  </Notice>
                )}
                {computed.some((e) => !e.error && e.duration_minutes === 0) && (
                  <Notice tone="warning">
                    Ajuste entrada e saída de cada apontamento. Não é possível finalizar com duração
                    zero; registre apenas as horas realmente trabalhadas.
                  </Notice>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <StepIntro icon={Truck} title="Deslocamento">
                  Selecione o modelo de cobrança utilizado nesta visita e confira o total calculado
                  antes da revisão.
                </StepIntro>

                {unitDisplacementHint && (
                  <Notice>
                    <strong>Valor sugerido pela unidade.</strong> {unitDisplacementHint}
                  </Notice>
                )}

                <div className="grid gap-2 md:grid-cols-3">
                  {(["none", "per_km", "fixed"] as DisplacementType[]).map((t) =>
                    (() => {
                      const copy = displacementOptionCopy(t);
                      const Icon = copy.icon;
                      const active = displacement.type === t;

                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setDisplacement((d) => ({ ...d, type: t }))}
                          className={cn(
                            "group flex min-h-24 items-start gap-3 rounded-2xl border p-3 text-left transition",
                            active
                              ? "border-primary/60 bg-primary/14 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_34px_-26px_rgba(255,153,51,0.8)]"
                              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:bg-white/[0.06]",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                              active
                                ? "border-primary/45 bg-primary/18 text-primary"
                                : "border-white/10 bg-white/[0.045] text-slate-400",
                            )}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-display text-sm font-black">
                              {copy.title}
                              {active && <Check size={14} className="text-primary" />}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-400">
                              {copy.helper}
                            </span>
                          </span>
                        </button>
                      );
                    })(),
                  )}
                </div>

                <section className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] sm:p-4">
                  {displacement.type === "none" && (
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                      <BadgeCheck size={18} className="mt-0.5 shrink-0" />
                      <div>
                        <div className="font-black">Sem custo de deslocamento</div>
                        <p className="mt-1 text-xs leading-5 text-emerald-100/80">
                          A OS seguirá para revisão apenas com mão de obra e materiais disponíveis.
                        </p>
                      </div>
                    </div>
                  )}

                  {displacement.type === "per_km" && (
                    <div className="grid gap-3 md:grid-cols-3">
                      <FieldGroup label="Quantidade de deslocamentos">
                        <Input
                          className={CONTROL_CLASS}
                          inputMode="numeric"
                          value={displacement.count}
                          onChange={(e) =>
                            setDisplacement((d) => ({ ...d, count: e.target.value }))
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label="Km total">
                        <Input
                          className={cn(CONTROL_CLASS, "tabular-nums")}
                          inputMode="decimal"
                          value={displacement.km_total}
                          onChange={(e) =>
                            setDisplacement((d) => ({ ...d, km_total: e.target.value }))
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label="Valor por km">
                        <Input
                          className={cn(CONTROL_CLASS, "tabular-nums")}
                          inputMode="decimal"
                          value={displacement.rate_input}
                          onChange={(e) =>
                            setDisplacement((d) => ({ ...d, rate_input: e.target.value }))
                          }
                        />
                      </FieldGroup>
                    </div>
                  )}

                  {displacement.type === "fixed" && (
                    <FieldGroup label="Valor fixo">
                      <Input
                        className={cn(CONTROL_CLASS, "max-w-sm font-semibold tabular-nums")}
                        inputMode="decimal"
                        value={displacement.fixed_input}
                        onChange={(e) =>
                          setDisplacement((d) => ({ ...d, fixed_input: e.target.value }))
                        }
                      />
                    </FieldGroup>
                  )}

                  {displacement.type !== "none" && (
                    <FieldGroup label="Observação" className="mt-3">
                      <Input
                        className={CONTROL_CLASS}
                        value={displacement.notes}
                        onChange={(e) => setDisplacement((d) => ({ ...d, notes: e.target.value }))}
                        placeholder="Ex.: 190 km ida e volta"
                      />
                    </FieldGroup>
                  )}

                  <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-bold text-slate-200">Total do deslocamento</span>
                    <span className="font-display text-lg font-black tabular-nums text-primary">
                      {formatBRL(displacementCents)}
                    </span>
                  </div>
                </section>

                {!stepDisplacementValid && displacement.type !== "none" && (
                  <Notice tone="warning">
                    Preencha os dados obrigatórios do deslocamento selecionado antes de continuar.
                  </Notice>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <StepIntro icon={ReceiptText} title="Revisão final">
                  Confira os apontamentos, o deslocamento e o total da OS antes de confirmar a
                  finalização.
                </StepIntro>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)]">
                  <section className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-display text-base font-black text-slate-50">
                          Apuração de horas
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {computed.length} apontamento{computed.length === 1 ? "" : "s"} na OS
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-right">
                        <div className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-slate-400">
                          Total
                        </div>
                        <div className="font-display text-sm font-black tabular-nums text-slate-50">
                          {formatHHmm(totals.totalLaborMinutes)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {computed.map((e) => {
                        const tech = techs.find((t) => t.id === e.technician_id);

                        return (
                          <div
                            key={e.uid}
                            className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-slate-50">
                                  {tech?.full_name ?? "Técnico não informado"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                                  <span>{formatDateBR(e.work_date)}</span>
                                  <span>
                                    {e.start_time} às {e.end_time}
                                  </span>
                                  {e.role && <span>{e.role}</span>}
                                </div>
                              </div>
                              <div className="text-left sm:text-right">
                                <div className="font-display text-base font-black tabular-nums text-primary">
                                  {formatBRL(e.subtotal_cents)}
                                </div>
                                <div className="text-xs font-semibold tabular-nums text-slate-400">
                                  {formatHHmm(e.duration_minutes)} ·{" "}
                                  {formatBRL(e.hourly_rate_cents)}/h
                                </div>
                              </div>
                            </div>
                            {e.description && !isAutoCalculatedEntry(e) && (
                              <p className="mt-2 rounded-xl bg-white/[0.035] px-3 py-2 text-xs leading-5 text-slate-300">
                                {e.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-primary/35 bg-[radial-gradient(circle_at_100%_0%,rgba(255,153,51,0.18),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_22px_52px_-32px_rgba(0,0,0,0.95)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary">
                          Total geral OS
                        </p>
                        <div className="mt-1 font-display text-3xl font-black tabular-nums text-slate-50 sm:text-4xl">
                          {formatBRL(totals.grandTotalCents)}
                        </div>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary">
                        <ReceiptText size={20} />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <SummaryRow
                        label="Total de horas"
                        value={formatHHmm(totals.totalLaborMinutes)}
                      />
                      <SummaryRow
                        label="Total mão de obra"
                        value={formatBRL(totals.totalLaborCents)}
                      />
                      <SummaryRow
                        label="Deslocamento"
                        value={formatBRL(totals.displacementCents)}
                      />
                      {totals.materialsCents > 0 && (
                        <SummaryRow label="Materiais" value={formatBRL(totals.materialsCents)} />
                      )}
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-xs leading-5 text-slate-300">
                      <div className="mb-1 flex items-center gap-2 font-black text-slate-100">
                        <Truck size={14} /> Deslocamento
                      </div>
                      {describeDisplacement(displacementInput)}
                    </div>
                  </section>
                </div>

                <FieldGroup label="Observações gerais">
                  <Textarea
                    className={cn(CONTROL_CLASS, "min-h-24 resize-none py-2")}
                    rows={3}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Notas internas sobre a apuração desta OS"
                  />
                </FieldGroup>

                {!signatureOk && (
                  <Notice tone="warning">
                    Assinatura do responsável pendente. Colete antes de finalizar ou peça ao
                    administrador para registrar a justificativa de exceção.
                  </Notice>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="mt-0 flex flex-col gap-3 border-t border-white/10 bg-[#0f1a2a]/95 px-4 py-3 shadow-[0_-16px_34px_-30px_rgba(0,0,0,0.9)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className={cn("grid gap-2 sm:flex", step > 0 ? "grid-cols-2" : "grid-cols-1")}>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-slate-300 hover:bg-white/[0.08] hover:text-slate-50 sm:w-auto"
            >
              Cancelar
            </Button>
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => setStep((s) => Math.max(0, s - 1) as StepIndex)}
                className="lemarc-secondary-action w-full sm:w-auto"
              >
                <ArrowLeft size={15} />
                Voltar
              </Button>
            )}
          </div>

          {step < 2 ? (
            <Button
              onClick={() => setStep((s) => Math.min(2, s + 1) as StepIndex)}
              disabled={
                (step === 0 && (!stepEntriesValid || !stepRatesValid)) ||
                (step === 1 && !stepDisplacementValid)
              }
              className="lemarc-primary-action w-full sm:w-auto"
            >
              {step === 1 ? "Ir para revisão" : "Continuar"}
              <ArrowRight size={15} />
            </Button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {!signatureOk && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCaptureOpen(true)}
                  className="lemarc-secondary-action w-full sm:w-auto"
                >
                  <FileText size={15} />
                  Coletar assinatura
                </Button>
              )}
              <Button
                onClick={() => mutation.mutate()}
                disabled={
                  mutation.isPending || !stepEntriesValid || !stepRatesValid || !signatureOk
                }
                title={
                  !signatureOk ? "Colete a assinatura do responsável antes de finalizar" : undefined
                }
                className="lemarc-primary-action w-full min-w-[13rem] sm:w-auto"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    Confirmar finalização
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>

        <SignatureCaptureDialog
          orderId={order.id}
          orderNumber={order.number}
          open={captureOpen}
          onOpenChange={setCaptureOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
