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
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/GlassCard";
import { FormFlowActions } from "@/components/app/FormFlowActions";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import { useClientsFullQuery, useAllUnitsQuery } from "@/hooks/useClients";
import {
  createClient as createClientFn,
  createServiceOrder,
  createTechnician,
} from "@/lib/api/serviceOrders.functions";
import {
  priorityLabel,
  serviceTypeLabel,
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
  techId: string;
  noTech: boolean;
  type: ServiceType;
  typeOther: string;
  priority: ServicePriority;
};

const STEPS = ["Dados", "Cliente", "Técnico", "Serviço", "Revisão"] as const;

const serviceTypes = Object.entries(serviceTypeLabel) as [ServiceType, string][];
const priorities = Object.entries(priorityLabel) as [ServicePriority, string][];

const priorityTone: Record<ServicePriority, string> = {
  baixa: "border-white/10 bg-white/[0.07] text-foreground hover:bg-white/[0.07]",
  media: "border-primary/40 bg-primary/15 text-primary hover:bg-primary/20",
  alta: "border-amber-400/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/20",
  urgente: "border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/20",
};
const priorityActive: Record<ServicePriority, string> = {
  baixa: "border-white/30 bg-white/15 text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  media: "border-primary bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.8)]",
  alta: "border-amber-400 bg-amber-400 text-amber-950 shadow-[0_8px_24px_-12px_rgba(251,191,36,0.7)]",
  urgente: "border-rose-500 bg-rose-500 text-white shadow-[0_8px_24px_-12px_rgba(244,63,94,0.7)]",
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
    techId: "",
    noTech: false,
    type: "mecanica",
    typeOther: "",
    priority: "media",
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

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
      Boolean(draft.techId) || draft.noTech,
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
          technician_id: draft.noTech ? null : draft.techId || null,
          service_type: draft.type,
          service_type_other:
            draft.type === "outro" ? draft.typeOther.trim() : null,
          priority: draft.priority,
          location: draft.location || null,
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
                set("techId", id);
                set("noTech", false);
              }}
            />
          </StepSlot>
          <StepSlot>
            <ServiceTypeStep draft={draft} set={set} />
          </StepSlot>
          <StepSlot>
            <ReviewStep draft={draft} clients={clients} technicians={technicians} />
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
      className="px-1"
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
    <GlassCard className="lemarc-wizard-card p-3 sm:p-4">
      <div className="flex items-center gap-1.5 sm:gap-3">
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
              className={cn(
                "group flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-2 text-left transition disabled:cursor-not-allowed",
                current
                  ? "border-primary/40 bg-primary/10"
                  : done
                    ? "border-white/10 bg-white/[0.07]"
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
        className="h-12 gap-2 rounded-2xl bg-white/[0.07] px-5 text-foreground hover:bg-white/[0.08] disabled:opacity-40 sm:h-14"
      >
        <ArrowLeft size={16} /> Voltar
      </Button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext || loading}
        className={cn(
          "lemarc-pressable flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition disabled:opacity-40 sm:h-14",
          canGoNext && !loading && "lemarc-orange-glow hover:-translate-y-0.5 active:scale-[0.98]",
        )}
      >
        {isLast ? <ClipboardCheck size={18} /> : <ArrowRight size={18} />}
        {loading
          ? "Criando OS..."
          : isLast
            ? "Criar ordem de serviço"
            : "Continuar"}
      </button>
    </FormFlowActions>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[11px] text-muted-foreground/80">{children}</p>;
}

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
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 1 · Dados iniciais"
        title="Conte o essencial da OS"
        description="Quanto melhor o contexto, mais ágil a execução em campo."
      />
      <div className="space-y-1">
        <FieldLabel required>Título do serviço</FieldLabel>
        <Input
          ref={titleRef}
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex.: Manutenção preventiva do compressor 02"
          className="h-14 rounded-xl border-white/10 bg-white/[0.07] text-base font-semibold text-foreground placeholder:text-white/55 focus-visible:ring-primary/40"
        />
        <FieldHint>Mínimo 3 caracteres. Use um título curto e específico.</FieldHint>
      </div>
      <div className="space-y-1">
        <FieldLabel>Descrição inicial</FieldLabel>
        <Textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Sintomas, escopo, ferramentas, EPI necessário…"
          className="min-h-32 rounded-xl border-white/10 bg-white/[0.07] text-sm leading-relaxed focus-visible:ring-primary/40"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>Local / setor</FieldLabel>
          <Input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Ex.: Casa de máquinas"
            className="h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Previsão de início</FieldLabel>
          <Input
            type="datetime-local"
            value={draft.scheduled}
            onChange={(e) => set("scheduled", e.target.value)}
            className="h-12 rounded-xl border-white/15 bg-white/[0.09] text-foreground focus-visible:ring-primary/40 [color-scheme:dark]"
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
  clients: { id: string; name: string; unit: string | null }[];
  units: { id: string; client_id: string; name: string; sector: string | null }[];
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
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || (c.unit ?? "").toLowerCase().includes(q),
    );
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
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
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
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente ou unidade…"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] pl-10 focus-visible:ring-primary/40"
            />
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
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
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">{c.name}</div>
                    {c.unit && (
                      <div className="truncate text-[11px] text-muted-foreground">{c.unit}</div>
                    )}
                  </div>
                  {active && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {draft.clientId && selectedUnits.length > 0 && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                Unidade do cliente
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => set("unitId", "")}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition",
                    draft.unitId === ""
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
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
                        "rounded-lg border px-3 py-2 text-left text-[11px] font-bold transition",
                        active
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
                      )}
                    >
                      <div className="truncate">{u.name}</div>
                      {u.sector && (
                        <div className="truncate text-[10px] text-muted-foreground/80">
                          {u.sector}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel required>Nome do cliente</FieldLabel>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Razão social ou nome fantasia"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Unidade (opcional)</FieldLabel>
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="Ex.: Filial Campinas"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
            />
          </div>
          <Button
            type="button"
            onClick={() => clientMutation.mutate()}
            disabled={!newName.trim() || clientMutation.isPending}
            className="h-12 w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
  technicians: { id: string; full_name: string; role: string | null }[];
  onCreated: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const createTec = useServerFn(createTechnician);
  const [mode, setMode] = useState<"select" | "new">("select");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter(
      (t) =>
        t.full_name.toLowerCase().includes(q) || (t.role ?? "").toLowerCase().includes(q),
    );
  }, [technicians, query]);

  const techMutation = useMutation({
    mutationFn: () => createTec({ data: { full_name: newName, role: newRole || null } }),
    onSuccess: (row) => {
      onCreated(row.id);
      setNewName("");
      setNewRole("");
      setMode("select");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 3 · Técnico"
        title="Quem vai executar?"
        description="Você pode atribuir um técnico agora ou deixar para definir depois."
      />

      <button
        type="button"
        onClick={() => {
          set("noTech", !draft.noTech);
          if (!draft.noTech) set("techId", "");
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
          draft.noTech
            ? "border-primary/40 bg-primary/10"
            : "border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05]",
        )}
      >
        <div>
          <div className="text-sm font-bold text-foreground">Sem técnico definido</div>
          <div className="text-[11px] text-muted-foreground">
            Atribuir depois, pelo painel da OS.
          </div>
        </div>
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full",
            draft.noTech ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground",
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

      {mode === "select" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar técnico ou função…"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] pl-10 focus-visible:ring-primary/40"
            />
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nenhum técnico encontrado.
              </p>
            )}
            {filtered.map((t) => {
              const active = draft.techId === t.id && !draft.noTech;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    set("techId", t.id);
                    set("noTech", false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition",
                    active
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">
                      {t.full_name}
                    </div>
                    {t.role && (
                      <div className="truncate text-[11px] text-muted-foreground">{t.role}</div>
                    )}
                  </div>
                  {active && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <FieldLabel required>Nome do técnico</FieldLabel>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome completo"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <FieldLabel>Função (opcional)</FieldLabel>
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Ex.: Eletricista industrial"
              className="h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
            />
          </div>
          <Button
            type="button"
            onClick={() => techMutation.mutate()}
            disabled={!newName.trim() || techMutation.isPending}
            className="h-12 w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
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
                  "group flex min-h-[88px] flex-col items-start gap-2 rounded-xl border px-3 py-3.5 text-left transition",
                  active
                    ? "border-primary/70 bg-primary/20 text-foreground shadow-[0_10px_28px_-14px_hsl(var(--primary)/0.8)] ring-1 ring-primary/60"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:-translate-y-0.5 hover:bg-white/[0.06] hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg",
                    active ? "bg-primary text-primary-foreground" : "bg-white/5 text-foreground",
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
        <div className="space-y-1 rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
          <FieldLabel required>Descreva o tipo de serviço</FieldLabel>
          <Input
            value={draft.typeOther}
            onChange={(e) => set("typeOther", e.target.value)}
            placeholder="Ex.: Calibração de sensores de vazão"
            className="h-12 rounded-xl border-white/15 bg-white/[0.09] focus-visible:ring-primary/40"
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
                  "min-h-12 rounded-xl border px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] transition",
                  active ? priorityActive[key] : priorityTone[key],
                )}
              >
                {label}
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
  technicians,
}: {
  draft: Draft;
  clients: { id: string; name: string; unit: string | null }[];
  technicians: { id: string; full_name: string; role: string | null }[];
}) {
  const client = clients.find((c) => c.id === draft.clientId);
  const tech = technicians.find((t) => t.id === draft.techId);
  return (
    <GlassCard className="lemarc-wizard-card space-y-5 p-5 sm:p-6">
      <StepHeader
        eyebrow="Etapa 5 · Revisão"
        title="Confira antes de criar"
        description="Você ainda pode voltar e ajustar qualquer dado."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewBlock title="Dados iniciais">
          <ReviewRow k="Título" v={draft.title || "—"} />
          <ReviewRow k="Descrição" v={draft.description || "—"} />
          <ReviewRow k="Local" v={draft.location || "—"} />
          <ReviewRow
            k="Previsão"
            v={draft.scheduled ? new Date(draft.scheduled).toLocaleString("pt-BR") : "—"}
          />
        </ReviewBlock>
        <ReviewBlock title="Cliente & técnico">
          <ReviewRow k="Cliente" v={client?.name ?? "—"} />
          <ReviewRow k="Unidade" v={client?.unit ?? "—"} />
          <ReviewRow
            k="Técnico"
            v={draft.noTech ? "Sem técnico definido" : (tech?.full_name ?? "—")}
          />
          <ReviewRow k="Função" v={tech?.role ?? "—"} />
        </ReviewBlock>
        <ReviewBlock title="Serviço">
          <ReviewRow k="Tipo" v={serviceTypeLabel[draft.type]} />
          <ReviewRow k="Prioridade" v={priorityLabel[draft.priority]} />
        </ReviewBlock>
      </div>
    </GlassCard>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {k}
      </span>
      <span className="max-w-[65%] text-right font-semibold text-foreground">{v}</span>
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
      <h2 className="mt-1 font-display text-xl font-black leading-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      )}
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
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.07] p-1">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={cn(
              "rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition",
              active
                ? "bg-primary text-primary-foreground shadow-[0_6px_20px_-12px_hsl(var(--primary)/0.8)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}