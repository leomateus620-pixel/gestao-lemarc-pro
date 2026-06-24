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
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const cnpjOk =
    !draft.cnpj.trim() || isValidCNPJ(draft.cnpj);

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
          units: draft.units,
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
        <p className="text-sm text-rose-300">
          {(mutation.error as Error).message}
        </p>
      )}

      <FormFlowActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || mutation.isPending}
          className="h-14 gap-2 rounded-2xl bg-white/[0.04] px-5 text-foreground hover:bg-white/[0.08] disabled:opacity-40"
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
            "lemarc-pressable flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition disabled:opacity-40",
            canNext && !mutation.isPending && "lemarc-orange-glow hover:-translate-y-0.5",
          )}
        >
          {isLast ? <ClipboardCheck size={18} /> : <ArrowRight size={18} />}
          {mutation.isPending
            ? "Salvando..."
            : isLast
              ? "Cadastrar empresa"
              : "Continuar"}
        </button>
      </FormFlowActions>
    </div>
  );
}

function Slot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-1"
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
    <GlassCard className="lemarc-wizard-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onJump(i)}
              disabled={i > step}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-2 text-left transition disabled:cursor-not-allowed",
                current
                  ? "border-primary/40 bg-primary/10"
                  : done
                    ? "border-white/10 bg-white/[0.04]"
                    : "border-white/5 bg-transparent opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black",
                  current
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/5 text-muted-foreground",
                )}
              >
                {done && validity[i] ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-[11px] font-black uppercase tracking-[0.14em] sm:block",
                  current ? "text-foreground" : "text-muted-foreground",
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
      <h2 className="mt-1 font-display text-xl font-black leading-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

const inputCls =
  "h-12 rounded-xl border-white/10 bg-white/[0.04] focus-visible:ring-primary/40";

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
      <div className="space-y-1">
        <Label required>Nome da empresa</Label>
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Razão social"
          className={inputCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>CNPJ</Label>
          <Input
            value={maskCNPJ(draft.cnpj)}
            onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
            placeholder="00.000.000/0000-00"
            className={cn(inputCls, !cnpjOk && "border-rose-500/50 focus-visible:ring-rose-500/40")}
          />
          {!cnpjOk && (
            <p className="mt-1 text-[11px] text-rose-300">CNPJ inválido. Verifique os dígitos.</p>
          )}
        </div>
        <div className="space-y-1">
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
        <div className="space-y-1">
          <Label required>Cidade</Label>
          <Input value={draft.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <Label required>UF</Label>
          <Input
            value={draft.state}
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="SP"
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Endereço completo</Label>
        <Input
          value={draft.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Rua, número, bairro"
          className={inputCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Telefone</Label>
          <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Responsável principal</Label>
        <Input
          value={draft.responsible_name}
          onChange={(e) => set("responsible_name", e.target.value)}
          placeholder="Nome do contato"
          className={inputCls}
        />
      </div>
      <div className="space-y-1">
        <Label>Observações internas</Label>
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-24 rounded-xl border-white/10 bg-white/[0.04] focus-visible:ring-primary/40"
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
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
          <Building2 size={26} className="mx-auto text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhuma unidade adicionada ainda.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {draft.units.map((u, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-[11px] font-black text-primary">
                  {idx + 1}
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                  Unidade {idx + 1}
                </span>
                {u.is_primary && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    <Star size={10} /> Principal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!u.is_primary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(idx)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-amber-300"
                    title="Marcar como principal"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeUnit(idx)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-300"
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label required>Nome</Label>
                <Input
                  value={u.name}
                  onChange={(e) => updUnit(idx, { name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label>Setor</Label>
                <Input
                  value={u.sector ?? ""}
                  onChange={(e) => updUnit(idx, { sector: e.target.value })}
                  placeholder="Ex.: Produção"
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input
                  value={u.city ?? ""}
                  onChange={(e) => updUnit(idx, { city: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input
                  value={u.state ?? ""}
                  onChange={(e) =>
                    updUnit(idx, { state: e.target.value.toUpperCase().slice(0, 2) })
                  }
                  className={inputCls}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Endereço</Label>
                <Input
                  value={u.address ?? ""}
                  onChange={(e) => updUnit(idx, { address: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Input
                  value={u.responsible_name ?? ""}
                  onChange={(e) => updUnit(idx, { responsible_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={u.phone ?? ""}
                  onChange={(e) => updUnit(idx, { phone: e.target.value })}
                  className={inputCls}
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
        className="h-12 w-full gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-foreground hover:bg-white/[0.05]"
      >
        <Plus size={16} /> Adicionar unidade
      </Button>
    </GlassCard>
  );
}

function ReviewStep({ draft }: { draft: Draft }) {
  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 4 · Revisão"
        title="Confira antes de cadastrar"
        description="Você ainda pode voltar e ajustar qualquer informação."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Block title="Empresa">
          <Row k="Nome" v={draft.name || "—"} />
          <Row k="CNPJ" v={draft.cnpj ? maskCNPJ(draft.cnpj) : "—"} />
          <Row k="Segmento" v={draft.segment || "—"} />
        </Block>
        <Block title="Localização & contato">
          <Row k="Cidade/UF" v={[draft.city, draft.state].filter(Boolean).join(" / ") || "—"} />
          <Row k="Endereço" v={draft.address || "—"} />
          <Row k="Telefone" v={draft.phone || "—"} />
          <Row k="E-mail" v={draft.email || "—"} />
          <Row k="Responsável" v={draft.responsible_name || "—"} />
        </Block>
        <Block title={`Unidades (${draft.units.length})`}>
          {draft.units.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma unidade adicionada.</p>
          ) : (
            draft.units.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-white/5 py-1.5 last:border-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">
                    {u.name}
                    {u.is_primary && <span className="ml-2 text-[10px] text-amber-300">★</span>}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <span className="max-w-[65%] text-right font-semibold text-foreground">{v}</span>
    </div>
  );
}

// re-export icon to silence unused warnings in some refactors
export const __icons = { MapPin };