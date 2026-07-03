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
  ClipboardCheck,
  Cog,
  FileText,
  HardHat,
  MapPin,
  Pencil,
  Plus,
  Search,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/GlassCard";
import { FormFlowActions } from "@/components/app/FormFlowActions";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import { useClientsFullQuery, useAllUnitsQuery } from "@/hooks/useClients";
import { maskCNPJ, onlyDigits } from "@/lib/cnpj";
import {
  createClient as createClientFn,
  createServiceOrder,
  createTechnician,
} from "@/lib/api/serviceOrders.functions";
import {
  priorityLabel,
  serviceTypeLabel,
  type TechnicianLite,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";
import { cn } from "@/lib/utils";

type Draft = {
  title: string;
  description: string;
  location: string;
  scheduled: string;
  clientId: string;
  unitId: string;
  techIds: string[];
  noTech: boolean;
  requesterName: string;
  type: ServiceType;
  typeOther: string;
  priority: ServicePriority;
};

const STEPS = ["Dados", "Cliente", "Técnico", "Serviço", "Revisão"] as const;

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

  const [step, setStep] = useState(0);
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
    if (step === 0) titleRef.current?.focus();
  }, [step]);

  // Sempre rolar para o topo ao mudar de etapa, em ambos os sentidos.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [step]);

  const validity = useMemo(() => {
    return [
      draft.title.trim().length >= 3,
      Boolean(draft.clientId),
      (draft.techIds.length > 0 || draft.noTech) && draft.requesterName.trim().length >= 2,
      Boolean(draft.type) &&
        Boolean(draft.priority) &&
        (draft.type !== "outro" || draft.typeOther.trim().length >= 3),
      true,
    ];
  }, [draft]);

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
  const isLast = step === STEPS.length - 1;

  function goNext() {
    if (!canGoNext) return;
    if (isLast) {
      orderMutation.mutate();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="mt-2 space-y-5">
      <WizardStepper step={step} validity={validity} onJump={(i) => i <= step && setStep(i)} />

      <div className="overflow-x-clip">
        <div
          className="flex w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            width: `${STEPS.length * 100}%`,
            transform: `translateX(-${(step * 100) / STEPS.length}%)`,
          }}
        >
          <StepSlot>
            <BasicInfoStep draft={draft} set={set} titleRef={titleRef} />
          </StepSlot>
          <StepSlot>
            <ClientStep
              draft={draft}
              set={set}
              clients={clients}
              units={units}
              onCreated={(id) => set("clientId", id)}
            />
          </StepSlot>
          <StepSlot>
            <TechnicianStep
              draft={draft}
              set={set}
              technicians={technicians}
              onCreated={(id) => {
                set("techIds", Array.from(new Set([...draft.techIds, id])));
                set("noTech", false);
              }}
            />
          </StepSlot>
          <StepSlot>
            <ServiceTypeStep draft={draft} set={set} />
          </StepSlot>
          <StepSlot>
            <ReviewStep draft={draft} clients={clients} units={units} technicians={technicians} />
          </StepSlot>
        </div>
      </div>

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

function StepSlot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-1 pb-2"
      style={{ flex: `0 0 ${100 / STEPS.length}%`, width: `${100 / STEPS.length}%` }}
    >
      {children}
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
    <GlassCard className="lemarc-wizard-card p-2.5 sm:p-4">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          const enabled = i <= step;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onJump(i)}
              disabled={!enabled}
              aria-current={current ? "step" : undefined}
              className={cn(
                "group flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:cursor-not-allowed disabled:opacity-100 sm:px-3",
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
        disabled={!canGoNext || loading}
        className={cn(
          "lemarc-primary-action lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 font-display text-sm font-black uppercase tracking-wider transition disabled:opacity-55 sm:h-14",
          canGoNext && !loading && "lemarc-orange-glow hover:-translate-y-0.5 active:scale-[0.98]",
        )}
      >
        {isLast ? <ClipboardCheck size={18} /> : <ArrowRight size={18} />}
        {loading ? "Criando OS..." : isLast ? "Criar ordem de serviço" : "Continuar"}
      </button>
    </FormFlowActions>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="lemarc-form-label text-[10px] font-black uppercase tracking-[0.16em]">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
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
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  titleRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <GlassCard className="lemarc-wizard-card space-y-6 p-5 pb-8 sm:p-6 sm:pb-8">
      <StepHeader
        eyebrow="Etapa 1 · Dados iniciais"
        title="Conte o essencial da OS"
        description="Quanto melhor o contexto, mais ágil a execução em campo."
      />
      <div className="space-y-2">
        <FieldLabel required>Título do serviço</FieldLabel>
        <Input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Manutenção preventiva do compressor 02"
          className={cn(inputCls, "h-14 text-base font-semibold")}
        />
        <FieldHint>Mínimo 3 caracteres. Use um título curto e específico.</FieldHint>
      </div>
      <div className="space-y-2">
        <FieldLabel>Descrição inicial</FieldLabel>
        <Textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sintomas, escopo, ferramentas, EPI necessário…"
          className={textareaCls}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>Local / setor</FieldLabel>
          <Input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Ex.: Casa de máquinas"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>Previsão de início</FieldLabel>
          <Input
            type="datetime-local"
            value={draft.scheduled}
            onChange={(e) => set("scheduled", e.target.value)}
            className={cn(inputCls, "[color-scheme:dark]")}
          />
          <FieldHint>Quando a execução está prevista para começar.</FieldHint>
        </div>
      </div>
    </GlassCard>
  );
}

/* ---------------- Step 2 ---------------- */

function ClientStep({
  draft,
  set,
  clients,
  units,
  onCreated,
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
    distance_km_from_base?: number | null;
    default_displacement_rate_cents?: number | null;
  }[];
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const createCli = useServerFn(createClientFn);
  const [mode, setMode] = useState<"select" | "new">("select");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");

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

  const clientMutation = useMutation({
    mutationFn: () => createCli({ data: { name: newName, unit: newUnit || null } }),
    onSuccess: (row) => {
      onCreated(row.id);
      set("unitId", "");
      setNewName("");
      setNewUnit("");
      setMode("select");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return (
    <GlassCard className="lemarc-wizard-card space-y-6 p-5 sm:p-6">
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
          <div className="relative">
            <Search size={15} className={searchIconCls} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente ou unidade…"
              className={cn(inputCls, "pl-10")}
            />
          </div>
          <div className="lemarc-form-panel max-h-[min(22rem,52vh)] space-y-1.5 overflow-y-auto rounded-2xl p-1.5 pr-2">
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
                  onClick={() => {
                    set("clientId", c.id);
                    set("unitId", "");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active
                      ? "lemarc-choice-card-active"
                      : "lemarc-choice-card hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">{c.name}</div>
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

          {draft.clientId && selectedUnits.length > 0 && (
            <div className="lemarc-form-panel space-y-2 rounded-2xl p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Unidade do cliente
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => set("unitId", "")}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    draft.unitId === ""
                      ? "lemarc-choice-card-active text-white"
                      : "lemarc-choice-card text-slate-300 hover:border-white/25 hover:text-white",
                  )}
                >
                  Sem unidade específica
                </button>
                {selectedUnits.map((u) => {
                  const active = draft.unitId === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => set("unitId", u.id)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                        active
                          ? "lemarc-choice-card-active text-white"
                          : "lemarc-choice-card text-slate-300 hover:border-white/25 hover:text-white",
                      )}
                    >
                      <div className="truncate">{u.name}</div>
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
                    <div className="mt-2 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-[11px] font-semibold text-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
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
        <div className="lemarc-form-panel space-y-4 rounded-2xl p-4">
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
            <FieldLabel>Unidade (opcional)</FieldLabel>
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Ex.: Filial Campinas"
              className={inputCls}
            />
          </div>
          <Button
            type="button"
            onClick={() => clientMutation.mutate()}
            disabled={!newName.trim() || clientMutation.isPending}
            className="lemarc-primary-action h-12 w-full gap-2 rounded-xl font-black uppercase tracking-wider"
          >
            <Plus size={16} />
            {clientMutation.isPending ? "Salvando..." : "Salvar e selecionar"}
          </Button>
        </div>
      )}
    </GlassCard>
  );
}

/* ---------------- Step 3 ---------------- */

function TechnicianStep({
  draft,
  set,
  technicians,
  onCreated,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  technicians: TechnicianLite[];
  onCreated: (id: string) => void;
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

  return (
    <GlassCard className="lemarc-wizard-card space-y-6 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 3 · Solicitante e técnico"
        title="Quem pediu e quem vai executar?"
        description="Informe quem solicitou esta OS e, se quiser, já atribua o técnico responsável."
      />

      <div className="lemarc-form-panel space-y-2 rounded-2xl p-4">
        <FieldLabel required>Solicitante da OS</FieldLabel>
        <Input
          value={draft.requesterName}
          onChange={(e) => set("requesterName", e.target.value.slice(0, 120))}
          placeholder="Nome de quem solicitou o serviço"
          className={inputCls}
          maxLength={120}
          autoComplete="off"
        />
        <FieldHint>Pessoa responsável pela abertura desta OS no cliente.</FieldHint>
      </div>

      <button
        type="button"
        onClick={() => {
          set("noTech", !draft.noTech);
          if (!draft.noTech) set("techIds", []);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
          draft.noTech
            ? "lemarc-choice-card-active"
            : "lemarc-form-panel border-dashed hover:border-white/30 hover:bg-white/[0.06]",
        )}
      >
        <div>
          <div className="text-sm font-black text-white">Sem técnico definido</div>
          <div className="text-[11px] font-semibold text-slate-300">
            Atribuir depois, pelo painel da OS.
          </div>
        </div>
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            draft.noTech ? "bg-primary text-primary-foreground" : "bg-white/[0.08] text-slate-300",
          )}
        >
          {draft.noTech && <Check size={14} />}
        </span>
      </button>

      <Segmented
        value={mode}
        onChange={setMode}
        items={[
          { value: "select", label: "Selecionar existente" },
          { value: "new", label: "Cadastrar novo" },
        ]}
      />

      {!draft.noTech && draft.techIds.length > 0 && (
        <div className="lemarc-review-card rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Técnicos selecionados
            </p>
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/45 bg-primary/20 px-2.5 py-1 text-[11px] font-black text-white shadow-[0_8px_18px_-14px_hsl(var(--primary)/0.8)]"
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
            />
          </div>
          <div className="lemarc-form-panel max-h-[min(22rem,52vh)] space-y-1.5 overflow-y-auto rounded-2xl p-1.5 pr-2">
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
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                    active
                      ? "lemarc-choice-card-active"
                      : "lemarc-choice-card hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-white">{t.full_name}</div>
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
        <div className="lemarc-form-panel space-y-4 rounded-2xl p-4">
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
            className="lemarc-primary-action h-12 w-full gap-2 rounded-xl font-black uppercase tracking-wider"
          >
            <Plus size={16} />
            {techMutation.isPending ? "Salvando..." : "Salvar e selecionar"}
          </Button>
        </div>
      )}
    </GlassCard>
  );
}

/* ---------------- Step 4 ---------------- */

function ServiceTypeStep({
  draft,
  set,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
}) {
  return (
    <GlassCard className="lemarc-wizard-card space-y-6 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 4 · Serviço"
        title="Que tipo de serviço é este?"
        description="A categoria e a prioridade orientam o roteiro da execução."
      />
      <div className="space-y-2">
        <FieldLabel required>Tipo de serviço</FieldLabel>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {serviceTypes.map(([key, label]) => {
            const Icon = typeIcon[key];
            const active = draft.type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("type", key)}
                className={cn(
                  "group relative flex min-h-[92px] flex-col items-start gap-2 rounded-xl border px-3 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                  active
                    ? "lemarc-choice-card-active text-white"
                    : "lemarc-choice-card text-slate-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07] hover:text-white",
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
                <span className="text-[11px] font-black uppercase tracking-[0.08em] leading-tight">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {draft.type === "outro" && (
        <div className="lemarc-form-panel space-y-2 rounded-2xl p-4">
          <FieldLabel required>Descreva o tipo de serviço</FieldLabel>
          <Input
            value={draft.typeOther}
            onChange={(e) => set("typeOther", e.target.value)}
            placeholder="Ex.: Calibração de sensores de vazão"
            className={inputCls}
            autoFocus
          />
          <FieldHint>Mínimo 3 caracteres. Este texto aparecerá na OS.</FieldHint>
        </div>
      )}

      <div className="space-y-2">
        <FieldLabel required>Prioridade</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {priorities.map(([key, label]) => {
            const active = draft.priority === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => set("priority", key)}
                className={cn(
                  "min-h-12 rounded-xl border px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
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
    </GlassCard>
  );
}

/* ---------------- Step 5 ---------------- */

function ReviewStep({
  draft,
  clients,
  units,
  technicians,
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
}) {
  const client = clients.find((c) => c.id === draft.clientId);
  const unit = units.find((u) => u.id === draft.unitId);
  const selectedTechs = draft.techIds
    .map((id) => technicians.find((t) => t.id === id))
    .filter((t): t is TechnicianLite => Boolean(t));
  const scheduledLabel = draft.scheduled
    ? new Date(draft.scheduled).toLocaleString("pt-BR")
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
  return (
    <div className="space-y-4">
      <GlassCard className="lemarc-wizard-card space-y-4 p-5 sm:p-6">
        <StepHeader
          eyebrow="Etapa 5 · Revisão"
          title="Confira antes de criar"
          description="Você ainda pode voltar e ajustar qualquer dado."
        />
        <div className="lemarc-summary-panel rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Título do serviço
          </p>
          <h3 className="mt-1.5 font-display text-xl font-black leading-tight text-white sm:text-2xl">
            {draft.title || "Não informado"}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/[0.1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-100">
              {typeLabel}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                priorityChip[draft.priority],
              )}
            >
              Prioridade {priorityLabel[draft.priority]}
            </span>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewSection title="Dados iniciais" icon={FileText}>
          <ReviewField label="Descrição">
            {draft.description?.trim() || "Não informado"}
          </ReviewField>
        </ReviewSection>

        <ReviewSection title="Local e previsão" icon={MapPin}>
          <ReviewField label="Local / setor">{draft.location || "Não informado"}</ReviewField>
          <ReviewField label="Previsão de início" icon={CalendarClock}>
            {scheduledLabel}
          </ReviewField>
        </ReviewSection>

        <ReviewSection title="Cliente e técnico" icon={Building2}>
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

        <ReviewSection title="Serviço e prioridade" icon={Sparkles}>
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
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Cog;
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
      <div className="mt-3 space-y-3">{children}</div>
    </div>
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
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
        {Icon && <Icon size={11} />}
        {label}
      </span>
      <span className="text-sm font-bold leading-relaxed text-white">{children}</span>
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
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-1 font-display text-xl font-black leading-tight text-white sm:text-2xl">
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
