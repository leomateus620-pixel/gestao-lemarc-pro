import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Calculator, Truck, ListChecks, Check } from "lucide-react";
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
  formatBRL,
  formatHHmm,
  parseBRLToCents,
} from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import { finalizeServiceOrder, getOrderFinancials } from "@/lib/api/financials.functions";
import type { DisplacementInput, DisplacementType, LaborEntryInput } from "@/types/financials";
import type { ServiceOrder } from "@/types/serviceOrder";

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

export function FinalizeServiceOrderDialog({ order, open, onOpenChange }: Props) {
  const techs = useMemo(() => getOrderTechnicians(order), [order]);
  const queryClient = useQueryClient();
  const fetcher = useServerFn(getOrderFinancials);
  const finalizeFn = useServerFn(finalizeServiceOrder);

  const { data: existing } = useQuery({
    queryKey: ["order-financials", order.id],
    queryFn: () => fetcher({ data: { orderId: order.id } }),
    enabled: open,
    staleTime: 0,
  });

  const [step, setStep] = useState<0 | 1 | 2>(0);
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
    const fallbackEnd = timeFromIso(order.finished_at ?? new Date().toISOString());
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
      setEntries(
        techs.map((t) => ({
          uid: uid(),
          technician_id: t.id,
          role: t.assignment_role ?? null,
          work_date: fallbackDate,
          start_time: fallbackStart,
          end_time: fallbackEnd > fallbackStart ? fallbackEnd : "17:00",
          hourly_rate_cents: t.hourly_rate_cents ?? 0,
          rate_input:
            t.hourly_rate_cents != null
              ? (t.hourly_rate_cents / 100).toFixed(2).replace(".", ",")
              : "",
          description: null,
        })),
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
  }, [open, existing, order, techs]);

  // Compute per-entry duration/subtotal preview.
  const computed = entries.map((e) => {
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
    setEntries((prev) => [
      ...prev,
      {
        uid: uid(),
        technician_id: tech.id,
        role: tech.assignment_role ?? null,
        work_date: todayISO(),
        start_time: "08:00",
        end_time: "17:00",
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
      queryClient.invalidateQueries({ queryKey: ["report-orders"] });
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao finalizar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={16} className="text-primary" />
            Apuração de horas e valores — OS #{order.number}
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <ol className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-wider">
          {[
            { i: 0, label: "Apontamentos", icon: ListChecks },
            { i: 1, label: "Deslocamento", icon: Truck },
            { i: 2, label: "Revisão", icon: Check },
          ].map(({ i, label, icon: Icon }) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2",
                step === i
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground",
              )}
            >
              <Icon size={14} />
              {label}
            </li>
          ))}
        </ol>

        <div className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {step === 0 && (
            <div className="space-y-3">
              {techs.length === 0 && (
                <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Vincule ao menos um técnico à OS antes de finalizar.
                </p>
              )}
              {computed.map((entry, i) => {
                const tech = techs.find((t) => t.id === entry.technician_id);
                return (
                  <div
                    key={entry.uid}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">
                          {tech?.full_name ?? "Técnico"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {entry.duration_minutes > 0
                            ? `${formatHHmm(entry.duration_minutes)} · ${formatBRL(entry.subtotal_cents)}`
                            : "—"}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeEntry(i)}
                        aria-label="Remover apontamento"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
                      <div className="sm:col-span-2">
                        <Label className="text-[10px]">Técnico</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={entry.technician_id}
                          onChange={(ev) => updateEntry(i, { technician_id: ev.target.value })}
                        >
                          {techs.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Função</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={entry.role ?? ""}
                          onChange={(ev) => updateEntry(i, { role: ev.target.value || null })}
                        >
                          <option value="">—</option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-[10px]">Data</Label>
                        <Input
                          type="date"
                          value={entry.work_date}
                          onChange={(ev) => updateEntry(i, { work_date: ev.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Entrada</Label>
                        <Input
                          type="time"
                          value={entry.start_time}
                          onChange={(ev) => updateEntry(i, { start_time: ev.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Saída</Label>
                        <Input
                          type="time"
                          value={entry.end_time}
                          onChange={(ev) => updateEntry(i, { end_time: ev.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[10px]">Valor da hora (R$)</Label>
                        <Input
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
                      </div>
                      <div className="sm:col-span-4">
                        <Label className="text-[10px]">Descrição do serviço executado</Label>
                        <Input
                          value={entry.description ?? ""}
                          onChange={(ev) =>
                            updateEntry(i, { description: ev.target.value || null })
                          }
                          placeholder="Ex.: troca de rolamento bomba 03"
                        />
                      </div>
                    </div>
                    {entry.error && <p className="mt-2 text-[11px] text-rose-300">{entry.error}</p>}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                {techs.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addEntry(t.id)}
                    className="gap-1.5"
                  >
                    <Plus size={12} /> Lançar para {t.full_name.split(" ")[0]}
                  </Button>
                ))}
              </div>
              {!stepRatesValid && (
                <p className="text-[11px] text-amber-300">
                  Informe o valor da hora de todos os técnicos antes de finalizar.
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["none", "per_km", "fixed"] as DisplacementType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDisplacement((d) => ({ ...d, type: t }))}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-bold",
                      displacement.type === t
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground",
                    )}
                  >
                    {t === "none" ? "Sem deslocamento" : t === "per_km" ? "Por km" : "Valor fixo"}
                  </button>
                ))}
              </div>

              {displacement.type === "per_km" && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div>
                    <Label className="text-[10px]">Qtd deslocamentos</Label>
                    <Input
                      inputMode="numeric"
                      value={displacement.count}
                      onChange={(e) => setDisplacement((d) => ({ ...d, count: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Km total</Label>
                    <Input
                      inputMode="decimal"
                      value={displacement.km_total}
                      onChange={(e) => setDisplacement((d) => ({ ...d, km_total: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">R$ por km</Label>
                    <Input
                      inputMode="decimal"
                      value={displacement.rate_input}
                      onChange={(e) =>
                        setDisplacement((d) => ({ ...d, rate_input: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {displacement.type === "fixed" && (
                <div>
                  <Label className="text-[10px]">Valor fixo (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={displacement.fixed_input}
                    onChange={(e) =>
                      setDisplacement((d) => ({ ...d, fixed_input: e.target.value }))
                    }
                  />
                </div>
              )}

              {displacement.type !== "none" && (
                <div>
                  <Label className="text-[10px]">Observação</Label>
                  <Input
                    value={displacement.notes}
                    onChange={(e) => setDisplacement((d) => ({ ...d, notes: e.target.value }))}
                    placeholder="Ex.: 190 KM IDA E VOLTA"
                  />
                </div>
              )}

              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm font-bold text-primary">
                Total deslocamento: {formatBRL(displacementCents)}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Apuração de horas
                </h4>
                <table className="mt-2 w-full text-xs">
                  <thead className="text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left">Técnico</th>
                      <th className="text-left">Data</th>
                      <th className="text-right">Horas</th>
                      <th className="text-right">R$/h</th>
                      <th className="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.map((e) => {
                      const tech = techs.find((t) => t.id === e.technician_id);
                      return (
                        <tr key={e.uid} className="border-t border-white/5">
                          <td className="py-1.5">{tech?.full_name ?? "—"}</td>
                          <td>{e.work_date}</td>
                          <td className="text-right tabular-nums">
                            {formatHHmm(e.duration_minutes)}
                          </td>
                          <td className="text-right tabular-nums">
                            {formatBRL(e.hourly_rate_cents)}
                          </td>
                          <td className="text-right tabular-nums">{formatBRL(e.subtotal_cents)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <Label className="text-[10px]">Observações gerais</Label>
                <Textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Notas internas sobre a apuração desta OS…"
                />
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
                <div className="flex justify-between text-sm">
                  <span>Total de horas</span>
                  <span className="tabular-nums">{formatHHmm(totals.totalLaborMinutes)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total mão de obra</span>
                  <span className="tabular-nums">{formatBRL(totals.totalLaborCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Deslocamento</span>
                  <span className="tabular-nums">{formatBRL(totals.displacementCents)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-primary/30 pt-2 text-base font-black text-primary">
                  <span>Total geral OS</span>
                  <span className="tabular-nums">{formatBRL(totals.grandTotalCents)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}>
                Voltar
              </Button>
            )}
          </div>
          {step < 2 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 0 | 1 | 2)}
              disabled={
                (step === 0 && (!stepEntriesValid || !stepRatesValid)) ||
                (step === 1 && !stepDisplacementValid)
              }
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !stepEntriesValid || !stepRatesValid}
            >
              {mutation.isPending ? "Finalizando…" : "Confirmar finalização"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
