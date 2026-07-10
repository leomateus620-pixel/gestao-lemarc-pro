import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  MapPin,
  Phone,
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
  const flowRef = useRef<HTMLDivElement>(null);
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
    const focusTimer = window.setTimeout(
      () => {
        const panel = flowRef.current?.querySelector<HTMLElement>(
          `[data-client-step-panel="${step}"]`,
        );
        const target = panel?.querySelector<HTMLElement>(
          "[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
        );
        target?.focus({ preventScroll: true });
      },
      reduce ? 0 : 180,
    );
    return () => window.clearTimeout(focusTimer);
  }, [step]);

  return (
    <div className="mt-2 space-y-4 pb-28 sm:space-y-5 md:pb-0">
      <Stepper step={step} validity={validity} onJump={(i) => i <= step && setStep(i)} />

      <div ref={flowRef} className="min-w-0">
        {step === 0 && (
          <div data-client-step-panel="0" className="lemarc-step-panel min-w-0 pb-2">
            <CompanyStep draft={draft} set={set} cnpjOk={cnpjOk} />
          </div>
        )}
        {step === 1 && (
          <div data-client-step-panel="1" className="lemarc-step-panel min-w-0 pb-2">
            <LocationStep draft={draft} set={set} />
          </div>
        )}
        {step === 2 && (
          <div data-client-step-panel="2" className="lemarc-step-panel min-w-0 pb-2">
            <UnitsStep draft={draft} set={set} />
          </div>
        )}
        {step === 3 && (
          <div data-client-step-panel="3" className="lemarc-step-panel min-w-0 pb-2">
            <ReviewStep draft={draft} />
          </div>
        )}
      </div>

      {mutation.isError && (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
          {(mutation.error as Error).message}
        </div>
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
            "lemarc-primary-action lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-display text-sm font-bold disabled:opacity-55 sm:h-14",
            canNext && !mutation.isPending && "lemarc-orange-glow hover:-translate-y-0.5",
          )}
        >
          {mutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isLast ? (
            <ClipboardCheck size={18} />
          ) : (
            <ArrowRight size={18} />
          )}
          {mutation.isPending ? "Salvando..." : isLast ? "Cadastrar empresa" : "Continuar"}
        </button>
      </FormFlowActions>
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
                  "hidden min-w-0 truncate text-[11px] font-bold sm:block lg:text-xs",
                  current ? "text-white" : done ? "text-emerald-50" : "text-slate-300",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-xs font-bold text-primary sm:hidden">
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
    <div className="max-w-3xl">
      <p className="lemarc-context-label">{eyebrow}</p>
      <h2 className="mt-1 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description && <p className="lemarc-form-help mt-1.5 text-sm font-medium">{description}</p>}
    </div>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="lemarc-form-label text-xs font-semibold">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function FormField({
  label,
  required,
  help,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label required={required}>{label}</Label>
      {children}
      {help && <p className="text-[11px] font-semibold leading-snug text-slate-400">{help}</p>}
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Building2;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("lemarc-client-form-section rounded-2xl p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-black leading-tight text-white sm:text-base">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[12px] font-medium leading-snug text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function PendingBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.04em] text-amber-100">
      <AlertTriangle size={11} />
      {children}
    </span>
  );
}

function ReadyBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.04em] text-emerald-100">
      <CheckCircle2 size={11} />
      {children}
    </span>
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
    <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:space-y-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 1 · Empresa"
        title="Identificação do cliente"
        description="Comece pelos dados que a equipe usa para reconhecer a empresa nas OS, relatórios e histórico operacional."
      />

      <FormSection
        icon={Building2}
        title="Dados principais"
        description="O nome é obrigatório. CNPJ e segmento ajudam na busca, conferência e organização comercial."
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(13rem,0.8fr)_minmax(12rem,0.85fr)]">
          <FormField label="Nome da empresa" required>
            <Input
              data-autofocus
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Lemarc Manutenção Industrial"
              className={inputCls}
            />
          </FormField>
          <FormField
            label="CNPJ"
            help="Opcional, mas recomendado para evitar cadastros duplicados."
          >
            <Input
              value={maskCNPJ(draft.cnpj)}
              onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
              placeholder="00.000.000/0000-00"
              className={cn(
                inputCls,
                !cnpjOk && "border-rose-500/50 focus-visible:ring-rose-500/40",
              )}
            />
            {!cnpjOk && (
              <p className="rounded-lg border border-rose-300/35 bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-100">
                CNPJ inválido. Verifique os dígitos antes de continuar.
              </p>
            )}
          </FormField>
          <FormField label="Segmento">
            <Input
              value={draft.segment}
              onChange={(e) => set("segment", e.target.value)}
              placeholder="Ex.: Usinagem"
              className={inputCls}
            />
          </FormField>
        </div>
      </FormSection>
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
    <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:space-y-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 2 · Localização & contato"
        title="Localização e contato"
        description="Separe o endereço principal dos contatos. Isso reduz erro na OS e deixa a equipe saber quem procurar."
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
        <FormSection
          icon={MapPin}
          title="Localização"
          description="Informe a base principal do cliente. Unidades específicas entram na próxima etapa."
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <FormField label="Cidade" required>
              <Input
                data-autofocus
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Ex.: Piracicaba"
                className={inputCls}
              />
            </FormField>
            <FormField label="UF" required>
              <Input
                value={draft.state}
                onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                className={inputCls}
              />
            </FormField>
          </div>
          <FormField label="Endereço completo" className="mt-3">
            <Input
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Rua, número, bairro"
              className={inputCls}
            />
          </FormField>
        </FormSection>

        <FormSection
          icon={Phone}
          title="Contato"
          description="Adicione um canal de referência para dúvidas de atendimento e faturamento."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <FormField label="Telefone">
              <Input
                value={draft.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(00) 00000-0000"
                className={inputCls}
              />
            </FormField>
            <FormField label="E-mail">
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contato@empresa.com.br"
                className={inputCls}
              />
            </FormField>
            <FormField label="Responsável principal" className="sm:col-span-2 xl:col-span-1">
              <Input
                value={draft.responsible_name}
                onChange={(e) => set("responsible_name", e.target.value)}
                placeholder="Nome do contato"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>
      </div>

      <FormSection
        icon={FileText}
        title="Observações internas"
        description="Use apenas informações operacionais úteis para a equipe Lemarc."
      >
        <FormField label="Notas">
          <Textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Ex.: regras de acesso, horários preferenciais, observações de atendimento..."
            className={textareaCls}
          />
        </FormField>
      </FormSection>
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
    <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:space-y-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <StepHeader
          eyebrow="Etapa 3 · Unidades"
          title="Unidades operacionais"
          description="Unidades são filiais, oficinas, setores ou locais onde a equipe pode vincular Ordens de Serviço."
        />
        {draft.units.length > 0 && (
          <button
            type="button"
            onClick={addUnit}
            className="lemarc-primary-action lemarc-pressable inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 font-display text-[11px] font-black uppercase tracking-[0.08em]"
          >
            <Plus size={15} /> Adicionar unidade
          </button>
        )}
      </div>

      {draft.units.length === 0 ? (
        <div className="lemarc-client-empty-state rounded-2xl p-5 text-center sm:p-7">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
            <Building2 size={22} />
          </span>
          <h3 className="mt-3 font-display text-lg font-black text-white">
            Nenhuma unidade adicionada ainda
          </h3>
          <p className="mx-auto mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
            Você ainda não adicionou nenhuma unidade. Adicione filiais, setores ou locais de
            atendimento para vincular as Ordens de Serviço corretamente.
          </p>
          <button
            type="button"
            onClick={addUnit}
            className="lemarc-primary-action lemarc-pressable mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 font-display text-[11px] font-black uppercase tracking-[0.08em]"
          >
            <Plus size={15} /> Adicionar unidade
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {draft.units.map((u, idx) => (
            <UnitDraftCard
              key={idx}
              unit={u}
              index={idx}
              onUpdate={(patch) => updUnit(idx, patch)}
              onRemove={() => removeUnit(idx)}
              onSetPrimary={() => setPrimary(idx)}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function UnitDraftCard({
  unit,
  index,
  onUpdate,
  onRemove,
  onSetPrimary,
}: {
  unit: ClientUnitInput;
  index: number;
  onUpdate: (patch: Partial<ClientUnitInput>) => void;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  const location = [unit.city, unit.state].filter(Boolean).join("/");
  const pending = getUnitPendingItems(unit);
  const cnpjInvalid = Boolean(unit.cnpj && !isValidCNPJ(unit.cnpj));

  return (
    <section className="lemarc-client-unit-card rounded-2xl p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/14 text-[11px] font-black text-primary">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-black leading-tight text-white">
                {unit.name || `Unidade ${index + 1}`}
              </h3>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-slate-400">
                {[
                  unit.sector,
                  location || "Local não informado",
                  unit.cnpj ? maskCNPJ(unit.cnpj) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {unit.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.04em] text-amber-100">
                <Star size={11} /> Principal
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pending.length === 0 ? (
              <ReadyBadge>Pronta para OS</ReadyBadge>
            ) : (
              pending.map((item) => <PendingBadge key={item}>{item}</PendingBadge>)
            )}
            {cnpjInvalid && <PendingBadge>CNPJ inválido</PendingBadge>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-start">
          {!unit.is_primary && (
            <button
              type="button"
              onClick={onSetPrimary}
              className="lemarc-pressable rounded-xl border border-white/[0.1] bg-white/[0.045] p-2 text-slate-300 transition hover:border-amber-300/40 hover:bg-amber-400/10 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              title="Marcar como principal"
            >
              <Star size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="lemarc-pressable rounded-xl border border-white/[0.1] bg-white/[0.045] p-2 text-slate-300 transition hover:border-rose-300/40 hover:bg-rose-500/12 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60"
            title="Remover unidade"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FormField label="Nome" required className="xl:col-span-2">
          <Input
            data-autofocus={index === 0 ? true : undefined}
            value={unit.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ex.: Matriz, Filial Norte"
            className={inputCls}
          />
        </FormField>
        <FormField label="Setor">
          <Input
            value={unit.sector ?? ""}
            onChange={(e) => onUpdate({ sector: e.target.value })}
            placeholder="Ex.: Produção"
            className={inputCls}
          />
        </FormField>
        <FormField label="CNPJ da unidade">
          <Input
            value={maskCNPJ(unit.cnpj ?? "")}
            onChange={(e) => onUpdate({ cnpj: onlyDigits(e.target.value) })}
            placeholder="00.000.000/0000-00"
            className={cn(
              inputCls,
              cnpjInvalid && "border-rose-500/50 focus-visible:ring-rose-500/40",
            )}
          />
          {cnpjInvalid && <p className="text-[11px] font-bold text-rose-200">CNPJ inválido.</p>}
        </FormField>
        <FormField label="Cidade">
          <Input
            value={unit.city ?? ""}
            onChange={(e) => onUpdate({ city: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="UF">
          <Input
            value={unit.state ?? ""}
            onChange={(e) => onUpdate({ state: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="SP"
            className={inputCls}
          />
        </FormField>
        <FormField label="Responsável">
          <Input
            value={unit.responsible_name ?? ""}
            onChange={(e) => onUpdate({ responsible_name: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Telefone">
          <Input
            value={unit.phone ?? ""}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            className={inputCls}
          />
        </FormField>
        <FormField label="Endereço" className="md:col-span-2">
          <Input
            value={unit.address ?? ""}
            onChange={(e) => onUpdate({ address: e.target.value })}
            className={inputCls}
          />
        </FormField>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <FormField label="Distância até a base (km)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={
              unit.distance_km_from_base === null || unit.distance_km_from_base === undefined
                ? ""
                : String(unit.distance_km_from_base)
            }
            onChange={(e) =>
              onUpdate({
                distance_km_from_base: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className={inputCls}
          />
        </FormField>
        <div className="md:col-span-2 flex items-end">
          <p className="text-[11px] font-medium leading-snug text-slate-400">
            O valor por km é configurado globalmente nas configurações do sistema.
          </p>
        </div>
      </div>

      <FormField label="Observações de cobrança / deslocamento" className="mt-3">
        <Textarea
          value={unit.billing_notes ?? ""}
          onChange={(e) => onUpdate({ billing_notes: e.target.value })}
          placeholder="Ex.: pedágios reembolsáveis, refeição obrigatória, restrições de horário..."
          className="lemarc-form-control min-h-20 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70"
        />
      </FormField>
    </section>
  );
}

function ReviewStep({ draft }: { draft: Draft }) {
  const empty = "Não informado";
  const cityState = [draft.city, draft.state].filter(Boolean).join(" / ");
  const pending = getReviewPendingItems(draft);

  return (
    <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:space-y-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 4 · Revisão"
        title="Confirmação final"
        description="Revise o que será salvo. Pendências não bloqueantes aparecem como avisos para correção antes ou depois do cadastro."
      />

      <div className="lemarc-summary-panel rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
              Empresa principal
            </p>
            <h3 className="mt-1.5 truncate font-display text-2xl font-black leading-tight text-white sm:text-3xl">
              {draft.name || empty}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              {[draft.segment || "Segmento não informado", cityState || "Local não informado"]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.cnpj ? (
              <ReadyBadge>{maskCNPJ(draft.cnpj)}</ReadyBadge>
            ) : (
              <PendingBadge>CNPJ não informado</PendingBadge>
            )}
            {draft.units.length > 0 ? (
              <ReadyBadge>
                {draft.units.length} unidade{draft.units.length > 1 ? "s" : ""}
              </ReadyBadge>
            ) : (
              <PendingBadge>Nenhuma unidade adicionada</PendingBadge>
            )}
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="lemarc-client-warning-strip rounded-2xl p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
              Pendências antes da criação
            </span>
            {pending.map((item) => (
              <PendingBadge key={item}>{item}</PendingBadge>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Block title="Identificação" icon={Building2}>
          <Row k="Nome" v={draft.name || empty} />
          <Row k="CNPJ" v={draft.cnpj ? maskCNPJ(draft.cnpj) : empty} />
          <Row k="Segmento" v={draft.segment || empty} />
        </Block>
        <Block title="Localização e contato" icon={MapPin}>
          <Row k="Cidade/UF" v={cityState || empty} />
          <Row k="Endereço" v={draft.address || empty} />
          <Row k="Telefone" v={draft.phone || empty} />
          <Row k="E-mail" v={draft.email || empty} />
          <Row k="Responsável" v={draft.responsible_name || empty} />
        </Block>
        <Block title={`Unidades cadastradas (${draft.units.length})`} icon={Building2}>
          {draft.units.length === 0 ? (
            <p className="text-sm font-semibold text-slate-300">
              Nenhuma unidade adicionada. As OS ainda poderão ser vinculadas ao cliente, mas sem
              separação por filial, setor ou local de atendimento.
            </p>
          ) : (
            draft.units.map((u, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">
                      {u.name || `Unidade ${i + 1}`}
                      {u.is_primary && (
                        <span className="ml-2 text-[10px] text-amber-100">Principal</span>
                      )}
                    </div>
                    <div className="truncate text-[11px] font-semibold text-slate-300">
                      {[
                        u.sector,
                        [u.city, u.state].filter(Boolean).join("/"),
                        u.cnpj ? maskCNPJ(u.cnpj) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Dados complementares pendentes"}
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                    {getUnitPendingItems(u).map((item) => (
                      <PendingBadge key={item}>{item}</PendingBadge>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </Block>
        <Block title="Observações internas" icon={FileText}>
          <p className="text-sm font-semibold leading-relaxed text-slate-200">
            {draft.notes || "Nenhuma observação interna informada."}
          </p>
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
  children: ReactNode;
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
    <div className="grid gap-1 border-b border-white/[0.055] py-2 text-sm last:border-0 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start sm:gap-3">
      <span className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">{k}</span>
      <span className="min-w-0 break-words font-bold text-white sm:text-right">{v}</span>
    </div>
  );
}

function getUnitPendingItems(unit: ClientUnitInput) {
  const items: string[] = [];
  if (!unit.name?.trim()) items.push("Nome pendente");
  if (!unit.sector?.trim()) items.push("Setor pendente");
  if (!unit.city?.trim() || !unit.state?.trim()) items.push("Local pendente");
  if (!unit.cnpj?.trim()) items.push("CNPJ opcional");
  return items.slice(0, 3);
}

function getReviewPendingItems(draft: Draft) {
  const items: string[] = [];
  if (!draft.cnpj.trim()) items.push("CNPJ não informado");
  if (!draft.segment.trim()) items.push("Segmento não informado");
  if (draft.units.length === 0) items.push("Nenhuma unidade adicionada");
  if (!draft.phone.trim() && !draft.email.trim() && !draft.responsible_name.trim()) {
    items.push("Contato incompleto");
  }
  return items;
}
