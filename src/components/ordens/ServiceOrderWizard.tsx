import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Cog,
  FileText,
  HardHat,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  TriangleAlert,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormFlowActions } from "@/components/app/FormFlowActions";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import { useClientsFullQuery, useAllUnitsQuery } from "@/hooks/useClients";
import { isValidCNPJ, maskCNPJ, onlyDigits } from "@/lib/cnpj";
import { createServiceOrder, createTechnician } from "@/lib/api/serviceOrders.functions";
import { createCompany } from "@/lib/api/clients.functions";
import {
  priorityLabel,
  serviceTypeLabel,
  type TechnicianLite,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import { cn } from "@/lib/utils";
import {
  SERVICE_ORDER_STEPS,
  canSubmitServiceOrder,
  getWizardActionLabel,
  getPreviousWizardStep,
  getWizardStepState,
  getWizardValidationIssues,
  getWizardValidity,
  type ServiceOrderWizardDraft as Draft,
  type WizardValidationIssue,
} from "@/lib/serviceOrders/wizard";

const serviceTypes = Object.entries(serviceTypeLabel) as [ServiceType, string][];
const priorities = Object.entries(priorityLabel) as [ServicePriority, string][];

const priorityTone: Record<ServicePriority, string> = {
  baixa:
    "border-slate-300/25 bg-slate-950/35 text-slate-100 hover:border-slate-200/40 hover:bg-white/[0.08]",
  media:
    "border-primary/45 bg-primary/14 text-orange-100 hover:border-primary/70 hover:bg-primary/20",
  alta: "border-amber-300/45 bg-amber-400/14 text-amber-100 hover:border-amber-300/70 hover:bg-amber-400/20",
  urgente:
    "border-rose-300/45 bg-rose-500/14 text-rose-100 hover:border-rose-300/70 hover:bg-rose-500/20",
};
const priorityActive: Record<ServicePriority, string> = {
  baixa: "border-slate-100/50 bg-white/18 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
  media:
    "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_-14px_hsl(var(--primary)/0.92)]",
  alta: "border-amber-300 bg-amber-300 text-slate-950 shadow-[0_12px_28px_-14px_rgba(251,191,36,0.85)]",
  urgente: "border-rose-400 bg-rose-500 text-white shadow-[0_12px_28px_-14px_rgba(244,63,94,0.85)]",
};

const typeIcon: Record<ServiceType, typeof Cog> = {
  mecanica: Cog,
  eletrica: Zap,
  automacao: Sparkles,
  montagem: HardHat,
  instalacao: Building2,
  visita: UserRound,
  emergencia: Zap,
  outro: Pencil,
};

export function ServiceOrderWizard({
  initialClientId,
  initialUnitId,
}: {
  initialClientId?: string;
  initialUnitId?: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clients } = useClientsFullQuery();
  const { data: units } = useAllUnitsQuery();
  const { data: technicians } = useTechniciansQuery();

  const flowRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    location: "",
    scheduled: "",
    clientId: initialClientId ?? "",
    unitId: initialUnitId ?? "",
    techIds: [],
    noTech: false,
    requesterName: "",
    type: "mecanica",
    typeOther: "",
    priority: "media",
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    flowRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    const focusTimer = window.setTimeout(
      () => {
        const target = flowRef.current?.querySelector<HTMLElement>(
          "[data-autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])",
        );
        target?.focus({ preventScroll: true });
      },
      reduce ? 0 : 160,
    );
    return () => window.clearTimeout(focusTimer);
  }, [step]);

  const validationIssues = useMemo(() => getWizardValidationIssues(draft), [draft]);
  const validity = useMemo(() => getWizardValidity(draft), [draft]);

  const createOrder = useServerFn(createServiceOrder);
  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder({
        data: {
          title: draft.title,
          description: draft.description || null,
          client_id: draft.clientId || null,
          client_unit_id: draft.unitId || null,
          technician_ids: draft.noTech ? [] : draft.techIds,
          service_type: draft.type,
          service_type_other: draft.type === "outro" ? draft.typeOther.trim() : null,
          priority: draft.priority,
          location: draft.location || null,
          requester_name: draft.requesterName.trim() || null,
          scheduled_for: draft.scheduled ? new Date(draft.scheduled).toISOString() : null,
        },
      }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      navigate({ to: "/ordens/$id", params: { id: row.id } });
    },
  });

  const canGoNext = validity[step];
  const isLast = step === SERVICE_ORDER_STEPS.length - 1;

  function goNext() {
    if (orderMutation.isPending) return;
    if (!canGoNext) {
      setAttemptedStep(step);
      window.requestAnimationFrame(() => {
        flowRef.current?.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
      });
      return;
    }
    if (isLast) {
      if (canSubmitServiceOrder(canGoNext, orderMutation.isPending)) orderMutation.mutate();
      return;
    }
    setAttemptedStep(null);
    setStep((s) => Math.min(s + 1, SERVICE_ORDER_STEPS.length - 1));
  }
  function goBack() {
    setAttemptedStep(null);
    setStep((s) => getPreviousWizardStep(s));
  }

  const visibleIssues = attemptedStep === step ? validationIssues[step] : [];

  return (
    <div className="lemarc-os-wizard mx-auto mt-1 w-full max-w-5xl space-y-4 sm:space-y-5">
      <WizardStepper
        step={step}
        validity={validity}
        onJump={(i) => {
          if (i > step) return;
          setAttemptedStep(null);
          setStep(i);
        }}
      />

      <div ref={flowRef} className="min-w-0 scroll-mt-[var(--lemarc-header-content-offset)]">
        {step === 0 && (
          <div
            role="tabpanel"
            aria-labelledby="order-step-0"
            data-order-step-panel="0"
            className="lemarc-step-panel min-w-0"
          >
            <BasicInfoStep draft={draft} set={set} titleRef={titleRef} issues={visibleIssues} />
          </div>
        )}
        {step === 1 && (
          <div
            role="tabpanel"
            aria-labelledby="order-step-1"
            data-order-step-panel="1"
            className="lemarc-step-panel min-w-0"
          >
            <ClientStep
              draft={draft}
              set={set}
              clients={clients}
              units={units}
              onCreated={(id) => set("clientId", id)}
              issues={visibleIssues}
            />
          </div>
        )}
        {step === 2 && (
          <div
            role="tabpanel"
            aria-labelledby="order-step-2"
            data-order-step-panel="2"
            className="lemarc-step-panel min-w-0"
          >
            <TechnicianStep
              draft={draft}
              set={set}
              technicians={technicians}
              onCreated={(id) => {
                set("techIds", Array.from(new Set([...draft.techIds, id])));
                set("noTech", false);
              }}
              issues={visibleIssues}
            />
          </div>
        )}
        {step === 3 && (
          <div
            role="tabpanel"
            aria-labelledby="order-step-3"
            data-order-step-panel="3"
            className="lemarc-step-panel min-w-0"
          >
            <ServiceTypeStep draft={draft} set={set} issues={visibleIssues} />
          </div>
        )}
        {step === 4 && (
          <div
            role="tabpanel"
            aria-labelledby="order-step-4"
            data-order-step-panel="4"
            className="lemarc-step-panel min-w-0"
          >
            <ReviewStep
              draft={draft}
              clients={clients}
              units={units}
              technicians={technicians}
              onEdit={setStep}
            />
          </div>
        )}
      </div>

      {visibleIssues.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="lemarc-validation-summary flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm"
        >
          <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Revise esta etapa para continuar:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
              {visibleIssues.map((issue) => (
                <li key={issue.field}>{issue.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {orderMutation.isError && (
        <p className="text-sm text-rose-300">
          Não foi possível criar a OS: {(orderMutation.error as Error).message}
        </p>
      )}

      <StepFooter
        step={step}
        isLast={isLast}
        canGoNext={canGoNext}
        loading={orderMutation.isPending}
        onBack={goBack}
        onNext={goNext}
      />
    </div>
  );
}

function WizardStepper({
  step,
  validity,
  onJump,
}: {
  step: number;
  validity: boolean[];
  onJump: (i: number) => void;
}) {
  return (
    <nav aria-label="Etapas da criação da ordem de serviço" className="lemarc-wizard-stepper">
      <div className="lemarc-wizard-progress" aria-hidden="true">
        <span style={{ width: `${(step / (SERVICE_ORDER_STEPS.length - 1)) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {SERVICE_ORDER_STEPS.map(({ shortLabel, label }, i) => {
          const state = getWizardStepState(i, step, validity[i]);
          const done = state === "complete";
          const current = i === step;
          const enabled = i <= step;
          return (
            <li key={label} className="relative min-w-0">
              <button
                id={`order-step-${i}`}
                type="button"
                onClick={() => onJump(i)}
                disabled={!enabled}
                aria-current={current ? "step" : undefined}
                aria-label={`Etapa ${i + 1} de ${SERVICE_ORDER_STEPS.length}: ${label}${done ? ", concluída" : current ? ", atual" : ", indisponível"}`}
                className="lemarc-wizard-step"
                data-state={state}
              >
                <span className="lemarc-wizard-step-index">
                  {done ? <Check aria-hidden="true" size={15} /> : i + 1}
                </span>
                <span className="lemarc-wizard-step-copy">
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center text-xs font-semibold text-slate-200 sm:hidden">
        Etapa {step + 1} de {SERVICE_ORDER_STEPS.length} · {SERVICE_ORDER_STEPS[step].label}
      </p>
    </nav>
  );
}

function StepFooter({
  step,
  isLast,
  canGoNext,
  loading,
  onBack,
  onNext,
}: {
  step: number;
  isLast: boolean;
  canGoNext: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <FormFlowActions>
      <Button
        type="button"
        variant="secondary"
        onClick={onBack}
        disabled={step === 0 || loading}
        className="lemarc-secondary-action h-12 gap-2 rounded-2xl px-5 font-bold hover:bg-white/[0.08] disabled:opacity-45 sm:h-14"
      >
        <ArrowLeft size={16} /> Voltar
      </Button>
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        className={cn(
          "lemarc-primary-action lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-display text-sm font-bold disabled:opacity-55 sm:h-14",
          canGoNext && !loading && "hover:-translate-y-0.5 active:scale-[0.98]",
          !canGoNext && !loading && "lemarc-primary-action--attention",
        )}
      >
        {isLast ? <ClipboardCheck size={18} /> : <ArrowRight size={18} />}
        {getWizardActionLabel(isLast, loading)}
      </button>
    </FormFlowActions>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="lemarc-form-label text-xs font-semibold">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      id={id}
      className="lemarc-field-error mt-1.5 flex items-center gap-1.5 text-xs font-semibold"
    >
      <TriangleAlert aria-hidden="true" size={13} />
      {children}
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="lemarc-form-help mt-1.5 text-[11px] font-medium">{children}</p>;
}

const inputCls =
  "lemarc-form-control h-12 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70";
const textareaCls =
  "lemarc-form-control min-h-32 rounded-xl text-sm leading-relaxed focus-visible:ring-2 focus-visible:ring-primary/70";
const searchIconCls =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300";

/* ---------------- Step 1 ---------------- */

function BasicInfoStep({
  draft,
  set,
  titleRef,
  issues,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
  issues: WizardValidationIssue[];
}) {
  const titleError = issues.find((issue) => issue.field === "title")?.message;
  const scheduledLabel = draft.scheduled
    ? new Date(draft.scheduled).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      })
    : "Nenhuma previsão selecionada";
  return (
    <section className="lemarc-os-wizard-surface space-y-6 p-4 sm:p-6 lg:p-7">
      <StepHeader
        eyebrow="Etapa 1 · Dados iniciais"
        title="Conte o essencial da OS"
        description="Quanto melhor o contexto, mais ágil a execução em campo."
      />
      <div className="space-y-2">
        <FieldLabel htmlFor="order-title" required>
          Título do serviço
        </FieldLabel>
        <Input
          id="order-title"
          ref={titleRef}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Manutenção do compressor 02"
          className={cn(inputCls, "h-14 text-base font-semibold")}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "order-title-error" : "order-title-hint"}
          data-invalid={titleError ? "true" : undefined}
        />
        <div id="order-title-hint">
          <FieldHint>Mínimo 3 caracteres. Use um título curto e específico.</FieldHint>
        </div>
        <FieldError id="order-title-error">{titleError}</FieldError>
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="order-description">Descrição inicial</FieldLabel>
        <Textarea
          id="order-description"
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sintomas, escopo, ferramentas, EPI necessário…"
          className={textareaCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="order-location">Local / setor</FieldLabel>
          <Input
            id="order-location"
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Ex.: Casa de máquinas"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="order-scheduled">Previsão de início</FieldLabel>
          <Input
            id="order-scheduled"
            type="datetime-local"
            value={draft.scheduled}
            onChange={(e) => set("scheduled", e.target.value)}
            className={cn(inputCls, "lemarc-datetime-control [color-scheme:dark]")}
          />
          <p className="lemarc-datetime-value" aria-live="polite">
            <CalendarClock aria-hidden="true" size={13} />
            {scheduledLabel}
          </p>
          <FieldHint>A previsão é opcional e só será salva após sua escolha.</FieldHint>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Step 2 ---------------- */

function ClientStep({
  draft,
  set,
  clients,
  units,
  onCreated,
  issues,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  clients: { id: string; name: string; unit: string | null; cnpj: string | null }[];
  units: {
    id: string;
    client_id: string;
    name: string;
    sector: string | null;
    cnpj?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
    distance_km_from_base?: number | null;
    default_displacement_rate_cents?: number | null;
  }[];
  onCreated: (id: string) => void;
  issues: WizardValidationIssue[];
}) {
  const queryClient = useQueryClient();
  const createCli = useServerFn(createCompany);
  const [mode, setMode] = useState<"select" | "new">("select");
  const [query, setQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newError, setNewError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    const qDigits = onlyDigits(q);
    return clients.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if ((c.unit ?? "").toLowerCase().includes(q)) return true;
      if (c.cnpj) {
        if (qDigits && c.cnpj.includes(qDigits)) return true;
        if (maskCNPJ(c.cnpj).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [clients, query]);

  const selectedUnits = useMemo(
    () => units.filter((u) => u.client_id === draft.clientId),
    [units, draft.clientId],
  );
  const showUnitSearch = selectedUnits.length > 6;
  const filteredUnits = useMemo(() => {
    const q = unitQuery.trim().toLowerCase();
    if (!q) return selectedUnits;
    const qDigits = onlyDigits(q);
    return selectedUnits.filter((u) => {
      if (u.name.toLowerCase().includes(q)) return true;
      if ((u.address ?? "").toLowerCase().includes(q)) return true;
      if ((u.city ?? "").toLowerCase().includes(q)) return true;
      if ((u.state ?? "").toLowerCase().includes(q)) return true;
      if ((u.sector ?? "").toLowerCase().includes(q)) return true;
      if (u.cnpj) {
        if (qDigits && u.cnpj.includes(qDigits)) return true;
        if (maskCNPJ(u.cnpj).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [selectedUnits, unitQuery]);
  const selectedUnitPinned = useMemo(() => {
    if (!draft.unitId) return null;
    if (filteredUnits.some((u) => u.id === draft.unitId)) return null;
    return selectedUnits.find((u) => u.id === draft.unitId) ?? null;
  }, [draft.unitId, filteredUnits, selectedUnits]);
  const selectedClient = clients.find((client) => client.id === draft.clientId);
  const clientError = issues.find((issue) => issue.field === "clientId")?.message;

  const clientMutation = useMutation({
    mutationFn: () => {
      const cnpjDigits = onlyDigits(newCnpj);
      if (cnpjDigits && !isValidCNPJ(cnpjDigits)) {
        throw new Error("CNPJ inválido.");
      }
      return createCli({
        data: {
          name: newName.trim(),
          cnpj: cnpjDigits || null,
          ...(newUnit.trim() ? { units: [{ name: newUnit.trim(), is_primary: true }] } : {}),
        },
      });
    },
    onSuccess: (row: { id: string }) => {
      setNewError(null);
      onCreated(row.id);
      set("unitId", "");
      setNewName("");
      setNewUnit("");
      setNewCnpj("");
      setMode("select");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-units"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar o cliente.";
      setNewError(msg);
    },
  });

  return (
    <section className="lemarc-os-wizard-surface space-y-5 p-4 sm:p-6 lg:p-7">
      <StepHeader
        eyebrow="Etapa 2 · Cliente"
        title="Para quem é esta ordem?"
        description="Selecione um cliente existente ou cadastre um novo sem sair do fluxo."
      />
      <Segmented
        value={mode}
        onChange={setMode}
        items={[
          { value: "select", label: "Selecionar existente" },
          { value: "new", label: "Cadastrar novo" },
        ]}
      />

      {mode === "select" ? (
        <div className="space-y-3">
          {selectedClient && (
            <div className="lemarc-selected-summary flex items-start gap-3 rounded-xl px-3.5 py-3">
              <CheckCircle2
                aria-hidden="true"
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-emerald-200">Cliente selecionado</p>
                <p className="mt-0.5 break-words text-sm font-semibold text-white">
                  {selectedClient.name}
                </p>
                {(selectedClient.unit || selectedClient.cnpj) && (
                  <p className="mt-0.5 break-words text-xs text-slate-300">
                    {[
                      selectedClient.unit,
                      selectedClient.cnpj ? maskCNPJ(selectedClient.cnpj) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="relative">
            <Search size={15} className={searchIconCls} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente ou unidade…"
              className={cn(inputCls, "pl-10")}
              aria-label="Buscar cliente por nome, unidade ou CNPJ"
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <span>{filtered.length === 1 ? "1 resultado" : `${filtered.length} resultados`}</span>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="min-h-11 rounded-lg px-2 font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                Limpar busca
              </button>
            )}
          </div>
          <div
            className="lemarc-selection-list space-y-1.5"
            role="listbox"
            aria-label="Clientes encontrados"
            aria-invalid={Boolean(clientError)}
            aria-describedby={clientError ? "order-client-error" : undefined}
            tabIndex={clientError ? -1 : undefined}
            data-invalid={clientError ? "true" : undefined}
          >
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm font-semibold text-slate-300">
                Nenhum cliente encontrado. Use “Cadastrar novo”.
              </p>
            )}
            {filtered.map((c) => {
              const active = draft.clientId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    set("clientId", c.id);
                    set("unitId", "");
                  }}
                  className={cn(
                    "lemarc-selection-row flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active
                      ? "lemarc-choice-card-active"
                      : "lemarc-choice-card hover:border-white/25 hover:bg-white/[0.07]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-white">{c.name}</div>
                    {c.unit && (
                      <div className="truncate text-[11px] font-semibold text-slate-300">
                        {c.unit}
                      </div>
                    )}
                    {c.cnpj && (
                      <div className="truncate font-mono text-[10px] font-semibold text-slate-400">
                        CNPJ {maskCNPJ(c.cnpj)}
                      </div>
                    )}
                  </div>
                  {active && (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.9)]">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <FieldError id="order-client-error">{clientError}</FieldError>

          {draft.clientId && selectedUnits.length > 0 && (
            <div className="lemarc-wizard-subsection space-y-3 border-t border-white/10 pt-5">
              <div>
                <p className="text-sm font-semibold text-white">Unidade do cliente</p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Vinculada ao cliente selecionado acima.
                </p>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => set("unitId", "")}
                  aria-pressed={draft.unitId === ""}
                  className={cn(
                    "lemarc-selection-row min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    draft.unitId === ""
                      ? "lemarc-choice-card-active text-white"
                      : "lemarc-choice-card text-slate-300 hover:border-white/25 hover:text-white",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    Sem unidade específica
                    {draft.unitId === "" && <Check aria-hidden="true" size={14} />}
                  </span>
                </button>
                {selectedUnits.map((u) => {
                  const active = draft.unitId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => set("unitId", u.id)}
                      aria-pressed={active}
                      className={cn(
                        "lemarc-selection-row min-h-11 rounded-lg border px-3 py-2 text-left text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                        active
                          ? "lemarc-choice-card-active text-white"
                          : "lemarc-choice-card text-slate-300 hover:border-white/25 hover:text-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="break-words">{u.name}</span>
                        {active && <Check aria-hidden="true" size={14} className="shrink-0" />}
                      </div>
                      {u.cnpj && (
                        <div className="truncate font-mono text-[10px] font-semibold text-slate-400">
                          {maskCNPJ(u.cnpj)}
                        </div>
                      )}
                      {(u.city || u.state || u.sector) && (
                        <div className="truncate text-[10px] font-semibold text-slate-400">
                          {[u.sector, [u.city, u.state].filter(Boolean).join("/")]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {draft.unitId &&
                (() => {
                  const selected = selectedUnits.find((u) => u.id === draft.unitId);
                  if (!selected) return null;
                  const hasExtra =
                    selected.cnpj ||
                    selected.city ||
                    selected.state ||
                    selected.distance_km_from_base != null ||
                    selected.default_displacement_rate_cents != null;
                  if (!hasExtra) return null;
                  return (
                    <div className="mt-2 border-l-2 border-primary/60 bg-primary/[0.07] px-3 py-2.5 text-xs font-medium text-slate-100">
                      <p className="text-xs font-semibold text-primary">
                        Dados da unidade selecionada
                      </p>
                      <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                        {selected.cnpj && (
                          <span>
                            <span className="text-slate-400">CNPJ:</span>{" "}
                            <span className="font-mono">{maskCNPJ(selected.cnpj)}</span>
                          </span>
                        )}
                        {(selected.city || selected.state) && (
                          <span>
                            <span className="text-slate-400">Cidade/UF:</span>{" "}
                            {[selected.city, selected.state].filter(Boolean).join("/")}
                          </span>
                        )}
                        {selected.distance_km_from_base != null && (
                          <span>
                            <span className="text-slate-400">Distância base:</span>{" "}
                            {selected.distance_km_from_base} km
                          </span>
                        )}
                        {selected.default_displacement_rate_cents != null && (
                          <span>
                            <span className="text-slate-400">Valor/km padrão:</span> R${" "}
                            {(selected.default_displacement_rate_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 border-t border-white/10 pt-5">
          <div className="space-y-2">
            <FieldLabel required>Nome do cliente</FieldLabel>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Razão social ou nome fantasia"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>CNPJ (opcional)</FieldLabel>
            <Input
              value={maskCNPJ(newCnpj)}
              onChange={(e) => setNewCnpj(onlyDigits(e.target.value).slice(0, 14))}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Unidade (opcional)</FieldLabel>
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Ex.: Filial Campinas"
              className={inputCls}
            />
          </div>
          {newError && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100">
              {newError}
            </p>
          )}
          <Button
            type="button"
            onClick={() => clientMutation.mutate()}
            disabled={!newName.trim() || clientMutation.isPending}
            className="lemarc-primary-action h-12 w-full gap-2 rounded-xl font-semibold"
          >
            <Plus size={16} />
            {clientMutation.isPending ? "Salvando..." : "Salvar e selecionar"}
          </Button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Step 3 ---------------- */

function TechnicianStep({
  draft,
  set,
  technicians,
  onCreated,
  issues,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  technicians: TechnicianLite[];
  onCreated: (id: string) => void;
  issues: WizardValidationIssue[];
}) {
  const queryClient = useQueryClient();
  const createTec = useServerFn(createTechnician);
  const [mode, setMode] = useState<"select" | "new">("select");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const activeTechnicians = useMemo(
    () => technicians.filter((technician) => technician.active !== false),
    [technicians],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeTechnicians;
    return activeTechnicians.filter(
      (t) => t.full_name.toLowerCase().includes(q) || (t.role ?? "").toLowerCase().includes(q),
    );
  }, [activeTechnicians, query]);

  const techMutation = useMutation({
    mutationFn: () =>
      createTec({ data: { full_name: newName, role: newRole || null, active: true } }),
    onSuccess: (row) => {
      onCreated(row.id);
      setNewName("");
      setNewRole("");
      setMode("select");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });
  const requesterError = issues.find((issue) => issue.field === "requesterName")?.message;
  const technicianError = issues.find((issue) => issue.field === "technician")?.message;

  return (
    <section className="lemarc-os-wizard-surface space-y-5 p-4 sm:p-6 lg:p-7">
      <StepHeader
        eyebrow="Etapa 3 · Solicitante e técnico"
        title="Quem pediu e quem vai executar?"
        description="Registre o solicitante e defina como a execução será atribuída."
      />

      <div className="lemarc-wizard-subsection space-y-2">
        <div>
          <p className="text-sm font-semibold text-white">Contexto do cliente</p>
          <p className="mt-0.5 text-xs text-slate-300">Quem solicitou a abertura desta OS.</p>
        </div>
        <FieldLabel htmlFor="order-requester" required>
          Solicitante da OS
        </FieldLabel>
        <Input
          id="order-requester"
          value={draft.requesterName}
          onChange={(e) => set("requesterName", e.target.value.slice(0, 120))}
          placeholder="Nome de quem solicitou o serviço"
          className={inputCls}
          maxLength={120}
          autoComplete="off"
          aria-invalid={Boolean(requesterError)}
          aria-describedby={requesterError ? "order-requester-error" : "order-requester-hint"}
          data-invalid={requesterError ? "true" : undefined}
        />
        <div id="order-requester-hint">
          <FieldHint>Pessoa responsável pela abertura desta OS no cliente.</FieldHint>
        </div>
        <FieldError id="order-requester-error">{requesterError}</FieldError>
      </div>

      <div
        className="lemarc-wizard-subsection space-y-3 border-t border-white/10 pt-5"
        aria-describedby={technicianError ? "order-technician-error" : undefined}
      >
        <div>
          <p className="text-sm font-semibold text-white">Execução da OS</p>
          <p className="mt-0.5 text-xs text-slate-300">
            Se a equipe ainda não estiver definida, registre essa decisão explicitamente.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={draft.noTech}
          onClick={() => {
            set("noTech", !draft.noTech);
            if (!draft.noTech) set("techIds", []);
          }}
          className={cn(
            "lemarc-selection-row flex min-h-14 w-full items-center justify-between rounded-lg border px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
            draft.noTech
              ? "lemarc-choice-card-active"
              : "lemarc-choice-card border-dashed hover:border-white/30 hover:bg-white/[0.06]",
          )}
          data-invalid={technicianError ? "true" : undefined}
        >
          <div>
            <div className="text-sm font-semibold text-white">Sem técnico definido</div>
            <div className="text-xs text-slate-300">
              A equipe será atribuída depois, no painel da OS.
            </div>
          </div>
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full border",
              draft.noTech
                ? "border-primary bg-primary text-primary-foreground"
                : "border-white/20 bg-white/[0.06] text-slate-300",
            )}
          >
            {draft.noTech && <Check aria-hidden="true" size={14} />}
          </span>
        </button>
        <FieldError id="order-technician-error">{technicianError}</FieldError>
      </div>

      <Segmented
        value={mode}
        onChange={setMode}
        items={[
          { value: "select", label: "Selecionar existente" },
          { value: "new", label: "Cadastrar novo" },
        ]}
      />

      {!draft.noTech && draft.techIds.length > 0 && (
        <div className="lemarc-selected-summary rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary">Técnicos selecionados</p>
            <span className="rounded-full border border-primary/50 bg-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-orange-100">
              {draft.techIds.length} {draft.techIds.length === 1 ? "técnico" : "técnicos"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {draft.techIds.map((id) => {
              const t = technicians.find((x) => x.id === id);
              if (!t) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-white"
                >
                  {t.full_name}
                  <button
                    type="button"
                    aria-label={`Remover ${t.full_name}`}
                    onClick={() =>
                      set(
                        "techIds",
                        draft.techIds.filter((x) => x !== id),
                      )
                    }
                    className="grid h-4 w-4 place-items-center rounded-full bg-primary/45 text-primary-foreground hover:bg-primary/70"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {mode === "select" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search size={15} className={searchIconCls} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar técnico ou função…"
              className={cn(inputCls, "pl-10")}
              aria-label="Buscar técnico por nome ou função"
            />
          </div>
          <p className="text-xs text-slate-300">
            {filtered.length === 1
              ? "1 técnico encontrado"
              : `${filtered.length} técnicos encontrados`}
          </p>
          <div className="lemarc-selection-list space-y-1.5">
            {technicians.length > activeTechnicians.length && (
              <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] font-bold text-amber-100">
                Colaboradores inativos ficam ocultos na criação de novas OS.
              </p>
            )}
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm font-semibold text-slate-300">
                Nenhum técnico encontrado.
              </p>
            )}
            {filtered.map((t) => {
              const active = draft.techIds.includes(t.id) && !draft.noTech;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    set("noTech", false);
                    if (active) {
                      set(
                        "techIds",
                        draft.techIds.filter((x) => x !== t.id),
                      );
                    } else {
                      set("techIds", Array.from(new Set([...draft.techIds, t.id])));
                    }
                  }}
                  className={cn(
                    "lemarc-selection-row flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active
                      ? "lemarc-choice-card-active"
                      : "lemarc-choice-card hover:border-white/25 hover:bg-white/[0.07]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-white">
                      {t.full_name}
                    </div>
                    {t.role && (
                      <div className="truncate text-[11px] font-semibold text-slate-300">
                        {t.role}
                      </div>
                    )}
                  </div>
                  {active && (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.9)]">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4 border-t border-white/10 pt-5">
          <div className="space-y-2">
            <FieldLabel required>Nome do técnico</FieldLabel>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome completo"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Função (opcional)</FieldLabel>
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Ex.: Eletricista industrial"
              className={inputCls}
            />
          </div>
          <Button
            type="button"
            onClick={() => techMutation.mutate()}
            disabled={!newName.trim() || techMutation.isPending}
            className="lemarc-primary-action h-12 w-full gap-2 rounded-xl font-semibold"
          >
            <Plus size={16} />
            {techMutation.isPending ? "Salvando..." : "Salvar e selecionar"}
          </Button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Step 4 ---------------- */

function ServiceTypeStep({
  draft,
  set,
  issues,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  issues: WizardValidationIssue[];
}) {
  const typeOtherError = issues.find((issue) => issue.field === "typeOther")?.message;
  return (
    <section className="lemarc-os-wizard-surface space-y-6 p-4 sm:p-6 lg:p-7">
      <StepHeader
        eyebrow="Etapa 4 · Serviço"
        title="Que tipo de serviço é este?"
        description="A categoria e a prioridade orientam o roteiro da execução."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
        <div className="space-y-2">
          <FieldLabel required>Tipo de serviço</FieldLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {serviceTypes.map(([key, label]) => {
              const Icon = typeIcon[key];
              const active = draft.type === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("type", key)}
                  className={cn(
                    "lemarc-selection-row group relative flex min-h-[88px] flex-col items-start gap-2 rounded-lg border px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active
                      ? "lemarc-choice-card-active text-white"
                      : "lemarc-choice-card text-slate-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  {active && (
                    <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_18px_-10px_hsl(var(--primary)/0.9)]">
                      <Check size={12} />
                    </span>
                  )}
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.08] text-slate-100",
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
          {draft.type === "outro" && (
            <div className="lemarc-option-reveal mt-3 space-y-2 border-l-2 border-primary/55 pl-3">
              <FieldLabel htmlFor="order-type-other" required>
                Descreva o tipo de serviço
              </FieldLabel>
              <Input
                id="order-type-other"
                value={draft.typeOther}
                onChange={(e) => set("typeOther", e.target.value)}
                placeholder="Ex.: Calibração de sensores de vazão"
                className={inputCls}
                autoFocus
                aria-invalid={Boolean(typeOtherError)}
                aria-describedby={typeOtherError ? "order-type-other-error" : undefined}
                data-invalid={typeOtherError ? "true" : undefined}
              />
              <FieldHint>Mínimo 3 caracteres. Este texto aparecerá na OS.</FieldHint>
              <FieldError id="order-type-other-error">{typeOtherError}</FieldError>
            </div>
          )}
        </div>

        <div className="space-y-2 lg:border-l lg:border-white/10 lg:pl-6">
          <FieldLabel required>Prioridade</FieldLabel>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {priorities.map(([key, label]) => {
              const active = draft.priority === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("priority", key)}
                  className={cn(
                    "lemarc-selection-row min-h-12 rounded-lg border px-3 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active ? priorityActive[key] : priorityTone[key],
                  )}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {active && <Check size={13} />}
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Step 5 ---------------- */

function ReviewStep({
  draft,
  clients,
  units,
  technicians,
  onEdit,
}: {
  draft: Draft;
  clients: { id: string; name: string; unit: string | null; cnpj: string | null }[];
  units: {
    id: string;
    client_id: string;
    name: string;
    sector: string | null;
    cnpj?: string | null;
    city?: string | null;
    state?: string | null;
  }[];
  technicians: TechnicianLite[];
  onEdit: (step: number) => void;
}) {
  const client = clients.find((c) => c.id === draft.clientId);
  const unit = units.find((u) => u.id === draft.unitId);
  const selectedTechs = draft.techIds
    .map((id) => technicians.find((t) => t.id === id))
    .filter((t): t is TechnicianLite => Boolean(t));
  const scheduledLabel = draft.scheduled
    ? new Date(draft.scheduled).toLocaleString("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Sem previsão definida";
  const unitLabel = unit
    ? [
        unit.name,
        unit.cnpj ? `CNPJ ${maskCNPJ(unit.cnpj)}` : null,
        unit.sector,
        [unit.city, unit.state].filter(Boolean).join("/") || null,
      ]
        .filter(Boolean)
        .join(" · ")
    : client?.unit || "Não informado";
  const typeLabel =
    draft.type === "outro" ? draft.typeOther.trim() || "Outro" : serviceTypeLabel[draft.type];
  const priorityChip: Record<ServicePriority, string> = {
    baixa: "border-slate-200/25 bg-white/10 text-slate-100",
    media: "border-primary/70 bg-primary/22 text-orange-100",
    alta: "border-amber-300/70 bg-amber-400/22 text-amber-100",
    urgente: "border-rose-300/70 bg-rose-500/22 text-rose-100",
  };
  const optionalMissing = [
    !draft.description.trim() ? "Descrição inicial" : null,
    !draft.location.trim() ? "Local / setor" : null,
    !draft.scheduled ? "Previsão de início" : null,
    !draft.unitId ? "Unidade específica" : null,
  ].filter((item): item is string => Boolean(item));
  return (
    <section className="lemarc-os-wizard-surface space-y-5 p-4 sm:p-6 lg:p-7">
      <StepHeader
        eyebrow="Etapa 5 · Revisão"
        title="Confira antes de criar"
        description="Você ainda pode voltar e ajustar qualquer dado."
      />
      <div className="lemarc-review-identity border-l-2 border-primary pl-3 sm:pl-4">
        <p className="text-xs font-semibold text-primary">Ordem de serviço</p>
        <h3 className="mt-1 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
          {draft.title || "Não informado"}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-100">
            {typeLabel}
          </span>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold",
              priorityChip[draft.priority],
            )}
          >
            Prioridade {priorityLabel[draft.priority]}
          </span>
        </div>
      </div>

      <div className="lemarc-review-grid grid gap-0 md:grid-cols-2">
        <ReviewSection title="Dados iniciais" icon={FileText} onEdit={() => onEdit(0)}>
          <ReviewField label="Descrição">
            {draft.description?.trim() || "Não informado"}
          </ReviewField>
        </ReviewSection>

        <ReviewSection title="Local e previsão" icon={MapPin} onEdit={() => onEdit(0)}>
          <ReviewField label="Local / setor">{draft.location || "Não informado"}</ReviewField>
          <ReviewField label="Previsão de início" icon={CalendarClock}>
            {scheduledLabel}
          </ReviewField>
        </ReviewSection>

        <ReviewSection title="Cliente e equipe" icon={Building2} onEdit={() => onEdit(1)}>
          <ReviewField label="Cliente">{client?.name ?? "Não informado"}</ReviewField>
          <ReviewField label="Unidade">{unitLabel}</ReviewField>
          <ReviewField label="Solicitante" icon={UserRound}>
            {draft.requesterName.trim() || "Não informado"}
          </ReviewField>
          <ReviewField label="Técnicos responsáveis" icon={HardHat}>
            {draft.noTech || selectedTechs.length === 0 ? (
              "Sem técnico definido"
            ) : (
              <span className="flex flex-col gap-1">
                {selectedTechs.map((t, idx) => (
                  <span key={t.id} className="leading-snug">
                    {t.full_name}
                    {t.role ? (
                      <span className="ml-1 text-[11px] font-semibold text-slate-300">
                        · {t.role}
                      </span>
                    ) : null}
                    {idx === 0 && selectedTechs.length > 1 ? (
                      <span className="ml-1 rounded-full border border-primary/40 bg-primary/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-primary">
                        Principal
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>
            )}
          </ReviewField>
        </ReviewSection>

        <ReviewSection title="Serviço e prioridade" icon={Sparkles} onEdit={() => onEdit(3)}>
          <ReviewField label="Tipo de serviço">{typeLabel}</ReviewField>
          <ReviewField label="Prioridade">
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em]",
                priorityChip[draft.priority],
              )}
            >
              {priorityLabel[draft.priority]}
            </span>
          </ReviewField>
        </ReviewSection>
      </div>

      {optionalMissing.length > 0 && (
        <div className="lemarc-optional-note flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs text-amber-50">
          <TriangleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-amber-300" />
          <p>
            <span className="font-semibold">Informações opcionais não preenchidas:</span>{" "}
            {optionalMissing.join(", ")}. A OS pode ser criada normalmente.
          </p>
        </div>
      )}
    </section>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
  onEdit,
}: {
  title: string;
  icon: typeof Cog;
  children: React.ReactNode;
  onEdit: () => void;
}) {
  return (
    <section className="lemarc-review-section py-4 md:px-4">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Icon size={14} />
        </span>
        <h3 className="flex-1 text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 rounded-lg px-2 text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        >
          Editar
        </button>
      </div>
      <dl className="mt-3 space-y-3">{children}</dl>
    </section>
  );
}

function ReviewField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Cog;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
        {Icon && <Icon size={11} />}
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold leading-relaxed text-white">{children}</dd>
    </div>
  );
}

/* ---------------- Shared ---------------- */

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
      <p className="lemarc-context-label">{eyebrow}</p>
      <h2 className="mt-1 font-display text-xl font-bold leading-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description && <p className="lemarc-form-help mt-1.5 text-sm font-medium">{description}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string }[];
}) {
  return (
    <div className="lemarc-form-panel grid grid-cols-2 gap-1 rounded-2xl p-1">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            aria-pressed={active}
            className={cn(
              "rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_22px_-12px_hsl(var(--primary)/0.9)]"
                : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
