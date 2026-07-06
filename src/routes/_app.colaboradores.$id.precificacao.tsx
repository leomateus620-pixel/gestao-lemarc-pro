import { Suspense, useMemo, useState } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { WalletCards } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import {
  updateTechnician,
  type TechnicianUpdateInput,
} from "@/lib/api/serviceOrders.functions";
import {
  centsToInput,
  formatCurrency,
  parseCurrencyInput,
} from "@/components/colaboradores/format";
import type { TechnicianLite } from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/colaboradores/$id/precificacao")({
  head: () => ({ meta: [{ title: "Editar precificação — Gestão Lemarc" }] }),
  component: PrecificacaoPage,
});

function PrecificacaoPage() {
  return (
    <AppShell title="Editar precificação" back fullscreenForm>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white/[0.06]" />}>
        <PrecificacaoContent />
      </Suspense>
    </AppShell>
  );
}

function PrecificacaoContent() {
  const { id } = Route.useParams();
  const { data: technicians } = useTechniciansQuery();
  const technician = technicians.find((item) => item.id === id);
  if (!technician) throw notFound();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTechnician);

  const [hourlyRate, setHourlyRate] = useState(() => centsToInput(technician.hourly_rate_cents));
  const [rate50, setRate50] = useState(() => centsToInput(technician.hourly_rate_50_cents));
  const [rate100, setRate100] = useState(() =>
    centsToInput(technician.hourly_rate_100_cents),
  );
  const [notes, setNotes] = useState(technician.pricing_notes ?? "");

  const normalCents = useMemo(() => parseCurrencyInput(hourlyRate), [hourlyRate]);
  const suggested50 = normalCents != null ? centsToInput(Math.round(normalCents * 1.5)) : "";
  const suggested100 = normalCents != null ? centsToInput(normalCents * 2) : "";

  const mutation = useMutation({
    mutationFn: (data: TechnicianUpdateInput) => updateFn({ data }),
    onSuccess: (row) => {
      if (row?.id) {
        queryClient.setQueryData<TechnicianLite[]>(["technicians"], (prev) =>
          (prev ?? []).map((t) => (t.id === row.id ? row : t)),
        );
      }
      toast.success("Precificação atualizada");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["technician-labor-history"] });
      queryClient.invalidateQueries({ queryKey: ["order-financials"] });
      queryClient.invalidateQueries({ queryKey: ["report-orders"] });
      navigate({ to: "/colaboradores/$id", params: { id } });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao salvar precificação"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (normalCents == null || normalCents <= 0) {
      toast.error("Informe um valor/hora válido");
      return;
    }
    const parsed50 = rate50.trim() ? parseCurrencyInput(rate50) : Math.round(normalCents * 1.5);
    const parsed100 = rate100.trim() ? parseCurrencyInput(rate100) : normalCents * 2;
    mutation.mutate({
      id,
      full_name: technician.full_name,
      role: technician.role,
      phone: technician.phone,
      email: technician.email,
      cpf: technician.cpf,
      specialty: technician.specialty,
      active: technician.active,
      kind: technician.kind,
      default_availability: technician.default_availability,
      hourly_rate_cents: normalCents,
      hourly_rate_50_cents: parsed50,
      hourly_rate_100_cents: parsed100,
      pricing_notes: notes.trim() || null,
      internal_notes: technician.internal_notes,
      user_id: technician.user_id,
    });
  }

  return (
    <main className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
        <header className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
            <WalletCards size={18} />
          </span>
          <div className="min-w-0">
            <p className="lemarc-technical-label">Precificação do colaborador</p>
            <h1 className="truncate font-display text-xl font-black text-white">
              {technician.full_name}
            </h1>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyField
            label="Valor normal (R$/h)"
            value={hourlyRate}
            onChange={setHourlyRate}
            required
            hint="Base para apontamento de horas em novas OS."
          />
          <MoneyField
            label="Hora extra 50% (R$/h)"
            value={rate50}
            onChange={setRate50}
            hint={suggested50 ? `Sugerido: R$ ${suggested50}` : "Opcional"}
          />
          <MoneyField
            label="Hora extra 100% (R$/h)"
            value={rate100}
            onChange={setRate100}
            hint={suggested100 ? `Sugerido: R$ ${suggested100}` : "Opcional"}
          />
          <div className="sm:col-span-2">
            <label className="lemarc-field">
              <span className="lemarc-technical-label">Observação de precificação</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="lemarc-input mt-1 resize-none"
                placeholder="Regras específicas, acordos, adicionais..."
              />
            </label>
          </div>
        </div>

        <div className="lemarc-horizontal-row items-center px-4 py-3">
          <span className="lemarc-technical-label">Valor atual salvo</span>
          <span className="ml-auto font-display text-sm font-black text-primary tabular-nums">
            {formatCurrency(technician.hourly_rate_cents)}
          </span>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate({ to: "/colaboradores/$id", params: { id } })}
            className="lemarc-pressable inline-flex min-h-11 items-center justify-center rounded-full border border-white/[0.11] bg-white/[0.055] px-5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="lemarc-primary-action inline-flex min-h-11 items-center justify-center rounded-full px-6 text-[11px] font-black uppercase tracking-[0.14em] disabled:opacity-60"
          >
            {mutation.isPending ? "Salvando..." : "Salvar precificação"}
          </button>
        </div>
      </form>
    </main>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="lemarc-field">
      <span className="lemarc-technical-label">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </span>
      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.04] px-3 focus-within:border-primary/50">
        <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">R$</span>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          placeholder="0,00"
          className="w-full bg-transparent py-2.5 text-right font-display text-base font-black text-white tabular-nums outline-none placeholder:text-slate-500"
        />
      </div>
      {hint && <span className="mt-1 block text-[10px] font-semibold text-slate-400">{hint}</span>}
    </label>
  );
}