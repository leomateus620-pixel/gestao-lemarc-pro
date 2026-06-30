import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  MapPin,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/GlassCard";
import { FormFlowActions } from "@/components/app/FormFlowActions";
import { createCompany } from "@/lib/api/clients.functions";
import { isValidCNPJ, maskCNPJ, onlyDigits } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientUnitInput } from "@/types/client";

type Draft = {
  name: string;
  cnpj: string;
  segment: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  responsible_name: string;
  notes: string;
  units: ClientUnitInput[];
};

const STEPS = ["Empresa", "Localização", "Unidades", "Revisão"] as const;

export function ClientWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    cnpj: "",
    segment: "",
    city: "",
    state: "",
    address: "",
    phone: "",
    email: "",
    responsible_name: "",
    notes: "",
    units: [],
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const cnpjOk = !draft.cnpj.trim() || isValidCNPJ(draft.cnpj);

  const validity = useMemo(
    () => [
      draft.name.trim().length >= 2 && cnpjOk,
      draft.city.trim().length >= 2 && draft.state.trim().length >= 2,
      true,
      true,
    ],
    [draft, cnpjOk],
  );

  const create = useServerFn(createCompany);
  const mutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          name: draft.name.trim(),
          cnpj: draft.cnpj ? onlyDigits(draft.cnpj) : null,
          segment: draft.segment || null,
          address: draft.address || null,
          city: draft.city || null,
          state: draft.state || null,
          phone: draft.phone || null,
          email: draft.email || null,
          responsible_name: draft.responsible_name || null,
          notes: draft.notes || null,
          units: draft.units.map((u) => ({
            ...u,
            cnpj: u.cnpj ? onlyDigits(u.cnpj) : null,
          })),
        },
      }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client-units"] });
      navigate({ to: "/clientes/$id", params: { id: row.id } });
    },
  });

  const isLast = step === STEPS.length - 1;
  const canNext = validity[step];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [step]);

  return (
    <div className="mt-2 space-y-5">
      <Stepper step={step} validity={validity} onJump={(i) => i <= step && setStep(i)} />

      <div className="overflow-x-clip">
        <div
          className="flex w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            width: `${STEPS.length * 100}%`,
            transform: `translateX(-${(step * 100) / STEPS.length}%)`,
          }}
        >
          <Slot>
            <CompanyStep draft={draft} set={set} cnpjOk={cnpjOk} />
          </Slot>
          <Slot>
            <LocationStep draft={draft} set={set} />
          </Slot>
          <Slot>
            <UnitsStep draft={draft} set={set} />
          </Slot>
          <Slot>
            <ReviewStep draft={draft} />
          </Slot>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-rose-300">{(mutation.error as Error).message}</p>
      )}

      <FormFlowActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || mutation.isPending}
          className="lemarc-secondary-action h-12 gap-2 rounded-2xl px-5 font-bold hover:bg-white/[0.08] disabled:opacity-45 sm:h-14"
        >
          <ArrowLeft size={16} /> Voltar
        </Button>
        <button
          type="button"
          disabled={!canNext || mutation.isPending}
          onClick={() => {
            if (isLast) mutation.mutate();
            else setStep((s) => Math.min(STEPS.length - 1, s + 1));
          }}
          className={cn(
            "lemarc-primary-action lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 font-display text-sm font-black uppercase tracking-wider transition disabled:opacity-55 sm:h-14",
            canNext && !mutation.isPending && "lemarc-orange-glow hover:-translate-y-0.5",
          )}
        >
          {isLast ? <ClipboardCheck size={18} /> : <ArrowRight size={18} />}
          {mutation.isPending ? "Salvando..." : isLast ? "Cadastrar empresa" : "Continuar"}
        </button>
      </FormFlowActions>
    </div>
  );
}

function Slot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-1 pb-2"
      style={{ flex: `0 0 ${100 / STEPS.length}%`, width: `${100 / STEPS.length}%` }}
    >
      {children}
    </div>
  );
}

function Stepper({
  step,
  validity,
  onJump,
}: {
  step: number;
  validity: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <GlassCard className="lemarc-wizard-card p-2.5 sm:p-4">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onJump(i)}
              disabled={i > step}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-100 sm:px-3",
                current
                  ? "border-primary bg-primary/18 text-white shadow-[0_12px_26px_-18px_hsl(var(--primary)/0.9)]"
                  : done
                    ? "border-emerald-300/35 bg-emerald-500/13 text-white"
                    : "border-white/10 bg-white/[0.035] text-slate-300/85",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-emerald-400/22 text-emerald-100"
                      : "bg-white/[0.08] text-slate-300",
                )}
              >
                {done && validity[i] ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden min-w-0 truncate text-[10px] font-black uppercase tracking-[0.1em] sm:block lg:text-[11px]",
                  current ? "text-white" : done ? "text-emerald-50" : "text-slate-300",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-primary sm:hidden">
        Etapa {step + 1} de {STEPS.length} · {STEPS[step]}
      </p>
    </GlassCard>
  );
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-1 font-display text-xl font-black leading-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description && <p className="lemarc-form-help mt-1.5 text-sm font-medium">{description}</p>}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="lemarc-form-label text-[10px] font-black uppercase tracking-[0.16em]">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

const inputCls =
  "lemarc-form-control h-12 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70";
const textareaCls =
  "lemarc-form-control min-h-24 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70";

function CompanyStep({
  draft,
  set,
  cnpjOk,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  cnpjOk: boolean;
}) {
  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 1 · Empresa"
        title="Dados da empresa"
        description="Identificação principal e segmento de atuação."
      />
      <div className="space-y-2">
        <Label required>Nome da empresa</Label>
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Razão social"
          className={inputCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={maskCNPJ(draft.cnpj)}
            onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
            placeholder="00.000.000/0000-00"
            className={cn(inputCls, !cnpjOk && "border-rose-500/50 focus-visible:ring-rose-500/40")}
          />
          {!cnpjOk && (
            <p className="mt-1 rounded-lg border border-rose-300/35 bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-100">
              CNPJ inválido. Verifique os dígitos.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Segmento</Label>
          <Input
            value={draft.segment}
            onChange={(e) => set("segment", e.target.value)}
            placeholder="Ex.: Usinagem, Alimentos, Petroquímica"
            className={inputCls}
          />
        </div>
      </div>
    </GlassCard>
  );
}

function LocationStep({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 2 · Localização & contato"
        title="Onde fica e quem responde"
        description="Endereço principal e contato de referência."
      />
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div className="space-y-2">
          <Label required>Cidade</Label>
          <Input
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <Label required>UF</Label>
          <Input
            value={draft.state}
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="SP"
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Endereço completo</Label>
        <Input
          value={draft.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Rua, número, bairro"
          className={inputCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Responsável principal</Label>
        <Input
          value={draft.responsible_name}
          onChange={(e) => set("responsible_name", e.target.value)}
          placeholder="Nome do contato"
          className={inputCls}
        />
      </div>
      <div className="space-y-2">
        <Label>Observações internas</Label>
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={textareaCls}
        />
      </div>
    </GlassCard>
  );
}

function UnitsStep({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  function addUnit() {
    set("units", [
      ...draft.units,
      {
        name: draft.units.length === 0 ? "Matriz" : `Unidade ${draft.units.length + 1}`,
        sector: "",
        city: draft.city,
        state: draft.state,
        address: "",
        responsible_name: "",
        phone: "",
        notes: "",
        is_primary: draft.units.length === 0,
        cnpj: "",
        distance_km_from_base: null,
        default_displacement_rate_cents: null,
        default_displacement_type: "km",
        billing_notes: "",
      },
    ]);
  }
  function updUnit(idx: number, patch: Partial<ClientUnitInput>) {
    set(
      "units",
      draft.units.map((u, i) => (i === idx ? { ...u, ...patch } : u)),
    );
  }
  function removeUnit(idx: number) {
    const next = draft.units.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((u) => u.is_primary)) next[0].is_primary = true;
    set("units", next);
  }
  function setPrimary(idx: number) {
    set(
      "units",
      draft.units.map((u, i) => ({ ...u, is_primary: i === idx })),
    );
  }

  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 3 · Unidades"
        title="Unidades operacionais"
        description="Adicione filiais, oficinas e setores. Você pode deixar para depois."
      />

      {draft.units.length === 0 && (
        <div className="lemarc-form-panel rounded-2xl border-dashed p-6 text-center">
          <Building2 size={26} className="mx-auto text-primary" />
          <p className="lemarc-form-help mt-2 text-sm font-semibold">
            Nenhuma unidade adicionada ainda.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {draft.units.map((u, idx) => (
          <div key={idx} className="lemarc-review-card rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-[11px] font-black text-primary">
                  {idx + 1}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Unidade {idx + 1}
                </span>
                {u.is_primary && (
                  <span className="flex items-center gap-1 rounded-md border border-amber-300/35 bg-amber-400/18 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-100">
                    <Star size={10} /> Principal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!u.is_primary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className="rounded-lg p-2 text-slate-300 transition hover:bg-white/[0.07] hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    title="Marcar como principal"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUnit(idx)}
                  className="rounded-lg p-2 text-slate-300 transition hover:bg-rose-500/12 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label required>Nome</Label>
                <Input
                  value={u.name}
                  onChange={(e) => updUnit(idx, { name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input
                  value={u.sector ?? ""}
                  onChange={(e) => updUnit(idx, { sector: e.target.value })}
                  placeholder="Ex.: Produção"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={u.city ?? ""}
                  onChange={(e) => updUnit(idx, { city: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input
                  value={u.state ?? ""}
                  onChange={(e) =>
                    updUnit(idx, { state: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={u.address ?? ""}
                  onChange={(e) => updUnit(idx, { address: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Input
                  value={u.responsible_name ?? ""}
                  onChange={(e) => updUnit(idx, { responsible_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={u.phone ?? ""}
                  onChange={(e) => updUnit(idx, { phone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ da unidade</Label>
                <Input
                  value={maskCNPJ(u.cnpj ?? "")}
                  onChange={(e) => updUnit(idx, { cnpj: onlyDigits(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  className={cn(
                    inputCls,
                    u.cnpj &&
                      !isValidCNPJ(u.cnpj) &&
                      "border-rose-500/50 focus-visible:ring-rose-500/40",
                  )}
                />
                {u.cnpj && !isValidCNPJ(u.cnpj) && (
                  <p className="text-[11px] font-bold text-rose-200">CNPJ inválido.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Distância até a base (km)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={
                    u.distance_km_from_base === null || u.distance_km_from_base === undefined
                      ? ""
                      : String(u.distance_km_from_base)
                  }
                  onChange={(e) =>
                    updUnit(idx, {
                      distance_km_from_base: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor/km padrão (R$)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={
                    u.default_displacement_rate_cents === null ||
                    u.default_displacement_rate_cents === undefined
                      ? ""
                      : String(u.default_displacement_rate_cents / 100)
                  }
                  onChange={(e) =>
                    updUnit(idx, {
                      default_displacement_rate_cents:
                        e.target.value === "" ? null : Math.round(Number(e.target.value) * 100),
                    })
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label>Cobrança de deslocamento</Label>
                <select
                  value={u.default_displacement_type ?? "km"}
                  onChange={(e) =>
                    updUnit(idx, {
                      default_displacement_type: e.target.value as "km" | "fixed" | "none",
                    })
                  }
                  className={cn(inputCls, "appearance-none bg-[#0d1420] px-3 text-sm")}
                >
                  <option value="km">Por km rodado</option>
                  <option value="fixed">Valor fixo</option>
                  <option value="none">Não cobrar</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações de cobrança / deslocamento</Label>
                <Textarea
                  value={u.billing_notes ?? ""}
                  onChange={(e) => updUnit(idx, { billing_notes: e.target.value })}
                  placeholder="Ex.: pedágios reembolsáveis, refeição obrigatória, restrições de horário…"
                  className="lemarc-form-control min-h-20 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        onClick={addUnit}
        variant="secondary"
        className="lemarc-secondary-action h-12 w-full gap-2 rounded-xl border-dashed font-black uppercase tracking-wider hover:bg-white/[0.08]"
      >
        <Plus size={16} /> Adicionar unidade
      </Button>
    </GlassCard>
  );
}

function ReviewStep({ draft }: { draft: Draft }) {
  const empty = "Não informado";
  const cityState = [draft.city, draft.state].filter(Boolean).join(" / ");

  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 4 · Revisão"
        title="Confira antes de cadastrar"
        description="Você ainda pode voltar e ajustar qualquer informação."
      />
      <div className="lemarc-summary-panel rounded-2xl p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Empresa</p>
        <h3 className="mt-1.5 font-display text-xl font-black leading-tight text-white sm:text-2xl">
          {draft.name || empty}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/20 bg-white/[0.1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100">
            {draft.cnpj ? maskCNPJ(draft.cnpj) : "CNPJ não informado"}
          </span>
          <span className="rounded-full border border-primary/50 bg-primary/18 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100">
            {draft.segment || "Segmento não informado"}
          </span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Empresa" icon={Building2}>
          <Row k="Nome" v={draft.name || empty} />
          <Row k="CNPJ" v={draft.cnpj ? maskCNPJ(draft.cnpj) : empty} />
          <Row k="Segmento" v={draft.segment || empty} />
        </Block>
        <Block title="Localização & contato" icon={MapPin}>
          <Row k="Cidade/UF" v={cityState || empty} />
          <Row k="Endereço" v={draft.address || empty} />
          <Row k="Telefone" v={draft.phone || empty} />
          <Row k="E-mail" v={draft.email || empty} />
          <Row k="Responsável" v={draft.responsible_name || empty} />
        </Block>
        <Block title={`Unidades (${draft.units.length})`} icon={Building2}>
          {draft.units.length === 0 ? (
            <p className="text-sm font-semibold text-slate-300">Nenhuma unidade adicionada.</p>
          ) : (
            draft.units.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">
                    {u.name}
                    {u.is_primary && <span className="ml-2 text-[10px] text-amber-100">★</span>}
                  </div>
                  <div className="truncate text-[11px] font-semibold text-slate-300">
                    {[u.sector, u.city, u.state].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </Block>
      </div>
    </GlassCard>
  );
}

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <div className="lemarc-review-card rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/30 bg-primary/18 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <Icon size={14} />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{title}</p>
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">{k}</span>
      <span className="max-w-[65%] text-right font-bold text-white">{v}</span>
    </div>
  );
}
