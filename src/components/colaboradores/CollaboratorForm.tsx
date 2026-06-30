import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TechnicianInput } from "@/lib/api/serviceOrders.functions";
import type { TechnicianLite } from "@/types/serviceOrder";
import { cn } from "@/lib/utils";
import {
  centsToInput,
  formatCpf,
  formatCurrency,
  formatPhone,
  parseCurrencyInput,
} from "./format";

const steps = ["Dados", "Operação", "Valor/hora", "Acesso", "Revisão"] as const;

type Draft = {
  fullName: string;
  phone: string;
  email: string;
  cpf: string;
  role: string;
  specialty: string;
  active: boolean;
  kind: string;
  defaultAvailability: string;
  hourlyRate: string;
  hourlyRate50: string;
  hourlyRate100: string;
  pricingNotes: string;
  userId: string;
  internalNotes: string;
};

export function CollaboratorForm({
  initial,
  loading,
  submitLabel,
  onSubmit,
  focus,
}: {
  initial?: TechnicianLite | null;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (data: TechnicianInput) => void;
  focus?: "dados" | "operacao" | "rate" | "acesso";
}) {
  const [step, setStep] = useState(() => focusToStep(focus));
  const [draft, setDraft] = useState<Draft>(() => buildDraft(initial));

  useEffect(() => {
    setDraft(buildDraft(initial));
  }, [initial]);

  useEffect(() => {
    if (focus) setStep(focusToStep(focus));
  }, [focus]);

  const normalRate = parseCurrencyInput(draft.hourlyRate);
  const rate50 = parseCurrencyInput(draft.hourlyRate50);
  const rate100 = parseCurrencyInput(draft.hourlyRate100);

  const validity = useMemo(
    () => [
      draft.fullName.trim().length >= 3,
      draft.role.trim().length >= 2 && draft.kind.trim().length > 0,
      normalRate != null && normalRate > 0,
      true,
      true,
    ],
    [draft.fullName, draft.kind, draft.role, normalRate],
  );

  const isLast = step === steps.length - 1;
  const canContinue = validity[step];

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function next() {
    if (!canContinue) return;
    if (!isLast) {
      setStep((value) => Math.min(value + 1, steps.length - 1));
      return;
    }
    onSubmit({
      full_name: draft.fullName.trim(),
      phone: clean(draft.phone),
      email: clean(draft.email),
      cpf: clean(draft.cpf),
      role: clean(draft.role),
      specialty: clean(draft.specialty),
      active: draft.active,
      kind: clean(draft.kind),
      default_availability: clean(draft.defaultAvailability),
      hourly_rate_cents: normalRate,
      hourly_rate_50_cents: rate50,
      hourly_rate_100_cents: rate100,
      pricing_notes: clean(draft.pricingNotes),
      internal_notes: clean(draft.internalNotes),
      user_id: clean(draft.userId),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="lemarc-operational-tabs">
        {steps.map((label, index) => {
          const current = index === step;
          const done = index < step && validity[index];
          return (
            <button
              key={label}
              type="button"
              disabled={index > step}
              onClick={() => index <= step && setStep(index)}
              className={cn(
                "lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-45",
                current
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_12px_26px_-18px_var(--primary)]"
                  : done
                    ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-100"
                    : "border-white/[0.1] bg-white/[0.045] text-slate-300",
              )}
            >
              {done ? <Check size={13} /> : index + 1}
              {label}
            </button>
          );
        })}
      </div>

      <section className="lemarc-wizard-card p-5 sm:p-6">
        {step === 0 && (
          <div className="space-y-5">
            <StepTitle
              icon={UserRound}
              label="Dados principais"
              title="Identificação do colaborador"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" required>
                <Input
                  value={draft.fullName}
                  onChange={(event) => set("fullName", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="Ex.: Douglas Martins"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={draft.phone}
                  onChange={(event) => set("phone", formatPhone(event.target.value))}
                  inputMode="tel"
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="(55) 99999-0000"
                />
              </Field>
              <Field label="E-mail">
                <Input
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                  type="email"
                  inputMode="email"
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="nome@lemarc.com.br"
                />
              </Field>
              <Field label="CPF opcional">
                <Input
                  value={draft.cpf}
                  onChange={(event) => set("cpf", formatCpf(event.target.value))}
                  inputMode="numeric"
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>
            <Field label="Observações internas">
              <Textarea
                value={draft.internalNotes}
                onChange={(event) => set("internalNotes", event.target.value)}
                className="lemarc-form-control min-h-28 rounded-xl"
                placeholder="Notas administrativas, restrições, preferências de escala..."
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <StepTitle icon={ShieldCheck} label="Função e operação" title="Perfil operacional" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Função / cargo" required>
                <Input
                  value={draft.role}
                  onChange={(event) => set("role", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="Técnico eletricista"
                />
              </Field>
              <Field label="Especialidade">
                <Input
                  value={draft.specialty}
                  onChange={(event) => set("specialty", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="Automação, elétrica, montagem..."
                />
              </Field>
              <Field label="Tipo">
                <select
                  value={draft.kind}
                  onChange={(event) => set("kind", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl px-3 text-sm"
                >
                  <option value="tecnico">Técnico</option>
                  <option value="auxiliar">Auxiliar</option>
                  <option value="responsavel">Responsável</option>
                  <option value="gestor">Gestor</option>
                  <option value="apoio">Apoio</option>
                </select>
              </Field>
              <Field label="Disponibilidade padrão">
                <Input
                  value={draft.defaultAvailability}
                  onChange={(event) => set("defaultAvailability", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  placeholder="Segunda a sexta, comercial"
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => set("active", !draft.active)}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                draft.active
                  ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-50"
                  : "border-zinc-400/35 bg-zinc-400/10 text-zinc-200",
              )}
            >
              <span>
                <span className="block text-sm font-black">
                  {draft.active ? "Colaborador ativo" : "Colaborador inativo"}
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold text-slate-300">
                  Inativos não aparecem na seleção padrão de novas OS.
                </span>
              </span>
              <span className="grid size-7 place-items-center rounded-full bg-white/[0.12]">
                {draft.active && <Check size={15} />}
              </span>
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <StepTitle icon={WalletCards} label="Valor/hora" title="Precificação operacional" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Valor hora normal" required>
                <Input
                  value={draft.hourlyRate}
                  onChange={(event) => set("hourlyRate", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  inputMode="decimal"
                  placeholder="85,00"
                />
              </Field>
              <Field label="Hora extra 50%">
                <Input
                  value={draft.hourlyRate50}
                  onChange={(event) => set("hourlyRate50", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  inputMode="decimal"
                  placeholder="127,50"
                />
              </Field>
              <Field label="Hora extra 100%">
                <Input
                  value={draft.hourlyRate100}
                  onChange={(event) => set("hourlyRate100", event.target.value)}
                  className="lemarc-form-control h-12 rounded-xl"
                  inputMode="decimal"
                  placeholder="170,00"
                />
              </Field>
            </div>
            <Field label="Observação de precificação">
              <Textarea
                value={draft.pricingNotes}
                onChange={(event) => set("pricingNotes", event.target.value)}
                className="lemarc-form-control min-h-24 rounded-xl"
                placeholder="Condições específicas, início de vigência, exceções..."
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <StepTitle
              icon={ShieldCheck}
              label="Acesso (opcional)"
              title="Vincular usuário do sistema"
            />
            <div className="lemarc-form-panel rounded-2xl p-4">
              <p className="text-sm font-black text-white">
                Etapa opcional — pode salvar sem vincular usuário.
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-300">
                Use este campo apenas quando o colaborador já tiver login no sistema. O ID do
                usuário é gerado automaticamente no cadastro de acesso e fica preparado para o
                futuro portal do técnico.
              </p>
            </div>
            <details className="rounded-2xl border border-white/[0.1] bg-white/[0.035] p-4">
              <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.12em] text-slate-300">
                Avançado · Vincular usuário existente
              </summary>
              <div className="mt-3 space-y-2">
                <Field label="ID do usuário (UUID)">
                  <Input
                    value={draft.userId}
                    onChange={(event) => set("userId", event.target.value)}
                    className="lemarc-form-control h-12 rounded-xl font-mono text-[12px]"
                    placeholder="00000000-0000-0000-0000-000000000000"
                  />
                </Field>
                <p className="text-[11px] font-semibold text-slate-400">
                  Deixe em branco se não houver login criado para este colaborador.
                </p>
              </div>
            </details>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <StepTitle icon={Check} label="Revisão" title="Confirme antes de salvar" />
            <div className="lemarc-summary-panel rounded-2xl p-5">
              <p className="font-display text-2xl font-black text-white">{draft.fullName}</p>
              <p className="mt-1 text-sm font-bold text-slate-300">
                {draft.role || "Função não informada"} · {draft.active ? "Ativo" : "Inativo"}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <ReviewMetric label="Valor normal" value={formatCurrency(normalRate)} />
                <ReviewMetric label="Hora extra 50%" value={formatCurrency(rate50)} />
                <ReviewMetric label="Hora extra 100%" value={formatCurrency(rate100)} />
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-300">
                {draft.userId.trim() ? "Usuário vinculado informado" : "Sem usuário vinculado"}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 rounded-3xl border border-white/[0.12] bg-[#08111f]/92 p-2 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="flex gap-2">
          {step === 0 ? (
            <Button asChild variant="secondary" className="h-12 rounded-2xl px-4">
              <Link to="/colaboradores">
                <ArrowLeft size={16} />
                Voltar
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((value) => Math.max(value - 1, 0))}
              className="h-12 rounded-2xl px-4"
              disabled={loading}
            >
              <ArrowLeft size={16} />
              Voltar
            </Button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={!canContinue || loading}
            className="lemarc-primary-action lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-4 font-display text-xs font-black uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {isLast ? <Check size={17} /> : <ArrowRight size={17} />}
            {loading ? "Salvando..." : isLast ? submitLabel : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
        <Icon size={18} />
      </span>
      <div>
        <p className="lemarc-technical-label">{label}</p>
        <h2 className="font-display text-xl font-black leading-tight text-white">{title}</h2>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="lemarc-form-label text-[10px] font-black uppercase tracking-[0.16em]">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="lemarc-compact-metric">
      <p className="lemarc-technical-label">{label}</p>
      <p className="mt-1 font-display text-sm font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function buildDraft(initial?: TechnicianLite | null): Draft {
  return {
    fullName: initial?.full_name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    cpf: initial?.cpf ?? "",
    role: initial?.role ?? "",
    specialty: initial?.specialty ?? "",
    active: initial?.active ?? true,
    kind: initial?.kind ?? "tecnico",
    defaultAvailability: initial?.default_availability ?? "",
    hourlyRate: centsToInput(initial?.hourly_rate_cents),
    hourlyRate50: centsToInput(initial?.hourly_rate_50_cents),
    hourlyRate100: centsToInput(initial?.hourly_rate_100_cents),
    pricingNotes: initial?.pricing_notes ?? "",
    userId: initial?.user_id ?? "",
    internalNotes: initial?.internal_notes ?? "",
  };
}

function clean(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
