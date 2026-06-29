import { Suspense, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  HardHat,
  IdCard,
  LogOut,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/components/app/AuthContext";
import { RoleSwitcher } from "@/components/app/RoleSwitcher";
import { useRole } from "@/components/app/RoleContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useServiceOrdersQuery,
  useTechnicianLaborHistoryQuery,
  useTechniciansQuery,
} from "@/hooks/useServiceOrders";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import {
  buildCollaboratorOperationalDashboard,
  formatMinutesShort,
  type CollaboratorHistoryItem,
  type CollaboratorOperationalStatus,
  type CollaboratorSummary,
} from "@/lib/serviceOrders/collaborators";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({ meta: [{ title: "Mais — Gestão Lemarc" }] }),
  errorComponent: MaisError,
  component: MaisPage,
});

type AccountTab = "profile" | "settings" | "session";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});

const statusStyles: Record<CollaboratorOperationalStatus, string> = {
  Disponível: "border-emerald-300/35 bg-emerald-300/12 text-emerald-200",
  Alocado: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  "Em deslocamento": "border-sky-300/35 bg-sky-300/12 text-sky-200",
  "Em campo": "border-primary/40 bg-primary/14 text-primary",
};

const statusRank: Record<CollaboratorOperationalStatus, number> = {
  "Em campo": 0,
  "Em deslocamento": 1,
  Alocado: 2,
  Disponível: 3,
};

function MaisPage() {
  return (
    <AppShell title="Mais">
      <Suspense fallback={<MaisSkeleton />}>
        <MaisContent />
      </Suspense>
    </AppShell>
  );
}

function MaisContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { displayName, email, avatarUrl, signOut } = useAuth();
  const { role } = useRole();
  const { data: orders } = useServiceOrdersQuery();
  const { data: technicians } = useTechniciansQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();
  const [accountTab, setAccountTab] = useState<AccountTab>("profile");
  const [refreshing, setRefreshing] = useState(false);

  const dashboard = useMemo(
    () =>
      buildCollaboratorOperationalDashboard({
        technicians,
        orders,
        laborHistory,
      }),
    [laborHistory, orders, technicians],
  );

  const collaborators = useMemo(
    () =>
      [...dashboard.collaborators].sort((a, b) => {
        const rank = statusRank[a.status] - statusRank[b.status];
        if (rank !== 0) return rank;
        return (
          b.ordersOpen - a.ordersOpen ||
          b.hoursMonthMinutes - a.hoursMonthMinutes ||
          a.name.localeCompare(b.name)
        );
      }),
    [dashboard.collaborators],
  );

  const firstName = displayName.split(" ")[0] || "Operação";
  const openOrders = collaborators.reduce((total, item) => total + item.ordersOpen, 0);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openAccount(tab: AccountTab) {
    setAccountTab(tab);
    scrollTo("conta");
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["technicians"] }),
        queryClient.invalidateQueries({ queryKey: ["technician-labor-history"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <MoreHero
        firstName={firstName}
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        role={role}
        collaborators={dashboard.kpis.total}
        openOrders={openOrders}
        monthHours={dashboard.kpis.hoursMonthMinutes}
      />

      <MoreNavigation
        collaboratorCount={dashboard.kpis.total}
        onCollaborators={() => scrollTo("colaboradores")}
        onProfile={() => openAccount("profile")}
        onSettings={() => openAccount("settings")}
        onSession={() => openAccount("session")}
      />

      <CollaboratorsPanel
        collaborators={collaborators}
        kpis={dashboard.kpis}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <AccountPreferencesPanel
        value={accountTab}
        onChange={setAccountTab}
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
        role={role}
        collaborators={dashboard.kpis.total}
        onSignOut={handleSignOut}
      />
    </div>
  );
}

function MoreHero({
  firstName,
  displayName,
  email,
  avatarUrl,
  role,
  collaborators,
  openOrders,
  monthHours,
}: {
  firstName: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  collaborators: number;
  openOrders: number;
  monthHours: number;
}) {
  return (
    <KineticPanel
      as="section"
      className="mt-2 overflow-hidden rounded-[1.45rem] border border-white/[0.14] bg-[#09111f] text-white shadow-[0_28px_60px_-36px_rgba(0,0,0,0.95)]"
      accent="orange"
      maxRotate={1.4}
      lift={-1.5}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.72) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.62) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(120deg, black, transparent 78%)",
        }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
      />
      <div className="relative z-[1] grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">
              Central operacional
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-black leading-none tracking-tight">Mais</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Central operacional da equipe, conta e preferências.
              </p>
            </div>
            <div className="hidden shrink-0 sm:block">
              <UserChip
                displayName={displayName}
                email={email}
                avatarUrl={avatarUrl}
                role={role}
                firstName={firstName}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:w-[26rem]">
          <HeroStat icon={HardHat} label="Colaboradores" value={collaborators} />
          <HeroStat icon={ClipboardList} label="OS abertas" value={openOrders} />
          <HeroStat icon={Clock3} label="Horas no mês" value={formatMinutesShort(monthHours)} />
        </div>

        <div className="sm:hidden">
          <UserChip
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
            role={role}
            firstName={firstName}
          />
        </div>
      </div>
    </KineticPanel>
  );
}

function UserChip({
  displayName,
  email,
  avatarUrl,
  role,
  firstName,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  firstName: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.045] p-2 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
      <Avatar name={displayName} src={avatarUrl} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-xs font-black text-white">{firstName}</p>
        <p className="max-w-[13rem] truncate text-[10px] font-medium text-slate-400">
          {email ?? (role === "gestor" ? "Gestor" : "Campo")}
        </p>
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.075] bg-white/[0.038] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
          {label}
        </span>
        <Icon size={13} className="text-primary" />
      </div>
      <p className="mt-1.5 font-display text-xl font-black leading-none tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

function MoreNavigation({
  collaboratorCount,
  onCollaborators,
  onProfile,
  onSettings,
  onSession,
}: {
  collaboratorCount: number;
  onCollaborators: () => void;
  onProfile: () => void;
  onSettings: () => void;
  onSession: () => void;
}) {
  return (
    <nav
      aria-label="Navegação do menu Mais"
      className="mt-3 rounded-[1.35rem] border border-[color:var(--on-app-bg)]/10 bg-white/55 p-2 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.5)] backdrop-blur-md"
    >
      <div className="grid gap-2 sm:grid-cols-4">
        <MoreNavButton
          icon={HardHat}
          label="Colaboradores"
          detail={`${collaboratorCount} no cadastro`}
          active
          onClick={onCollaborators}
        />
        <MoreNavButton
          icon={IdCard}
          label="Perfil e conta"
          detail="Usuário atual"
          onClick={onProfile}
        />
        <MoreNavButton
          icon={SlidersHorizontal}
          label="Configurações"
          detail="Preferências"
          onClick={onSettings}
        />
        <MoreNavButton icon={LogOut} label="Sessão" detail="Acesso seguro" onClick={onSession} />
      </div>
    </nav>
  );
}

function MoreNavButton({
  icon: Icon,
  label,
  detail,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "lemarc-pressable flex min-h-[4.25rem] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        active
          ? "border-primary/35 bg-[linear-gradient(135deg,rgba(255,122,24,0.18),rgba(10,17,31,0.92))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_14px_30px_-24px_rgba(255,122,24,0.75)]"
          : "border-[color:var(--on-app-bg)]/10 bg-white/65 text-[color:var(--on-app-bg)] hover:border-primary/30 hover:bg-white",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl border",
          active
            ? "border-primary/40 bg-primary/18 text-primary"
            : "border-[color:var(--on-app-bg)]/10 bg-[color:var(--on-app-bg)]/5 text-[color:var(--on-app-bg)]",
        )}
      >
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[12px] font-black uppercase tracking-[0.11em]">
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 block truncate text-[10px] font-semibold",
            active ? "text-slate-300" : "text-[color:var(--on-app-bg-muted)]",
          )}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

function CollaboratorsPanel({
  collaborators,
  kpis,
  onRefresh,
  refreshing,
}: {
  collaborators: CollaboratorSummary[];
  kpis: ReturnType<typeof buildCollaboratorOperationalDashboard>["kpis"];
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  const [listOpen, setListOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const visibleLimit = 4;
  const visibleCollaborators = showAll ? collaborators : collaborators.slice(0, visibleLimit);
  const hasMore = collaborators.length > visibleLimit;

  return (
    <section id="colaboradores" className="mt-5 scroll-mt-24">
      <PremiumSection className="p-3 sm:p-4" accent="orange">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
                <HardHat size={16} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
                  Equipe técnica
                </p>
                <h2 className="font-display text-xl font-black text-foreground">Colaboradores</h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Status, OS, horas e valores são derivados dos técnicos cadastrados, OS vinculadas e
              apontamentos financeiros reais.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <PanelButton icon={Activity} onClick={() => void onRefresh()} disabled={refreshing}>
              {refreshing ? "Atualizando" : "Atualizar dados"}
            </PanelButton>
            <PanelButton
              icon={listOpen ? ChevronDown : ChevronRight}
              onClick={() => setListOpen((v) => !v)}
            >
              {listOpen ? "Ocultar lista" : "Ver colaboradores"}
            </PanelButton>
          </div>
        </div>

        <OperationalKpis kpis={kpis} />

        {listOpen && (
          <>
            {collaborators.length === 0 ? (
              <EmptyCollaborators />
            ) : (
              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    {showAll
                      ? `${collaborators.length} colaboradores`
                      : `Resumo com ${visibleCollaborators.length} de ${collaborators.length}`}
                  </p>
                  {hasMore && (
                    <button
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                      className="lemarc-pressable rounded-full border border-white/[0.12] bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    >
                      {showAll ? "Recolher" : "Ver todos"}
                    </button>
                  )}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {visibleCollaborators.map((collaborator) => (
                    <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </PremiumSection>
    </section>
  );
}

function OperationalKpis({
  kpis,
}: {
  kpis: ReturnType<typeof buildCollaboratorOperationalDashboard>["kpis"];
}) {
  const items = [
    { icon: Users, label: "Total", value: kpis.total, tone: "steel" as const },
    { icon: Activity, label: "Em campo", value: kpis.inField, tone: "orange" as const },
    { icon: ShieldCheck, label: "Disponíveis", value: kpis.available, tone: "green" as const },
    { icon: CalendarClock, label: "Deslocamento", value: kpis.inTransit, tone: "blue" as const },
    {
      icon: Clock3,
      label: "Horas no mês",
      value: formatMinutesShort(kpis.hoursMonthMinutes),
      tone: "steel" as const,
    },
    {
      icon: Briefcase,
      label: "Serviços no mês",
      value: kpis.completedMonth,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lemarc-smart-scroll sm:grid sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <KpiTile key={item.label} {...item} />
      ))}
    </div>
  );
}

function CollaboratorCard({ collaborator }: { collaborator: CollaboratorSummary }) {
  const latest = collaborator.history[0];
  const accent =
    collaborator.status === "Em campo" || collaborator.status === "Em deslocamento"
      ? "orange"
      : "steel";

  return (
    <article
      className="group relative overflow-hidden rounded-[1.35rem] border border-white/[0.12] bg-[linear-gradient(145deg,oklch(0.265_0.047_252/0.96),oklch(0.13_0.036_252/0.93))] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_22px_48px_-32px_rgba(0,0,0,0.9)] transition duration-200 hover:border-white/[0.18] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.17),0_28px_56px_-34px_rgba(0,0,0,0.95)]"
      style={surfaceVars(accent)}
    >
      <div className="absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full bg-[var(--lemarc-card-accent)] shadow-[0_0_18px_var(--lemarc-card-glow)]" />
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative">
        <div className="flex items-start gap-3">
          <Avatar name={collaborator.name} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-[15px] font-black leading-tight text-white">
                {collaborator.name}
              </h3>
              <StatusBadge status={collaborator.status} />
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-400">
              {collaborator.role ?? "Função não informada"} · {collaborator.internalCode}
            </p>
          </div>
          <Link
            to="/ordens"
            search={{
              status: "todas",
              period: "all",
              from: "",
              to: "",
              filtro: "none",
              q: collaborator.name,
            }}
            className="lemarc-pressable grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.1] bg-white/[0.055] text-primary hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label={`Ver OS de ${collaborator.name}`}
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <CompactMetric label="OS abertas" value={emptyAwareNumber(collaborator.ordersOpen)} />
          <CompactMetric
            label="Horas mês"
            value={
              collaborator.hoursMonthMinutes > 0
                ? formatMinutesShort(collaborator.hoursMonthMinutes)
                : "Sem horas"
            }
          />
          <CompactMetric label="Serviços" value={emptyAwareNumber(collaborator.servicesMonth)} />
          <CompactMetric
            label="Valor"
            value={formatCurrencyCompact(collaborator.valueMonthCents)}
            muted={!collaborator.valueMonthCents}
          />
        </div>

        <Accordion type="single" collapsible className="mt-3">
          <AccordionItem value="history" className="border-white/[0.08]">
            <AccordionTrigger className="min-h-11 rounded-2xl border border-white/[0.075] bg-white/[0.035] px-3 py-2 text-left hover:no-underline data-[state=open]:border-primary/35 data-[state=open]:bg-primary/10 [&>svg]:text-primary">
              <span className="min-w-0">
                <span className="block font-display text-[11px] font-black uppercase tracking-[0.15em] text-slate-200">
                  Histórico
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-400">
                  {latest
                    ? `${latest.orderNumber ? `OS #${latest.orderNumber}` : "OS"} · ${latest.clientName}`
                    : "Sem histórico apurado no período."}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-0 pt-2">
              <CollaboratorHistory collaborator={collaborator} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </article>
  );
}

function CollaboratorHistory({ collaborator }: { collaborator: CollaboratorSummary }) {
  if (collaborator.history.length === 0) {
    return (
      <CompactEmpty
        icon={Clock3}
        title="Sem histórico apurado no período."
        text="Quando houver OS finalizada ou apontamento de horas, o resumo aparece aqui."
      />
    );
  }

  return (
    <div className="space-y-2">
      {collaborator.history.map((item) => (
        <HistoryRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function HistoryRow({ item }: { item: CollaboratorHistoryItem }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-black text-white">
            {item.orderNumber ? `OS #${item.orderNumber}` : "OS"} · {item.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {item.clientName}
            {item.unitName ? ` · ${item.unitName}` : ""} · {item.serviceLabel}
          </p>
        </div>
        <Link
          to="/ordens/$id"
          params={{ id: item.orderId }}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-primary hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          aria-label={`Abrir OS ${item.orderNumber ?? item.orderId}`}
        >
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <HistoryChip icon={CalendarClock}>{formatDate(item.date)}</HistoryChip>
        <HistoryChip icon={Clock3}>{formatMinutesShort(item.minutes)}</HistoryChip>
        <HistoryChip icon={CircleDollarSign}>
          {formatCurrencyOrPending(item.valueCents)}
        </HistoryChip>
        <HistoryChip icon={Wrench}>{item.statusLabel}</HistoryChip>
        <HistoryChip icon={ClipboardList}>{item.source}</HistoryChip>
      </div>
      {item.description && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-400">
          {item.description}
        </p>
      )}
    </div>
  );
}

function AccountPreferencesPanel({
  value,
  onChange,
  displayName,
  email,
  avatarUrl,
  role,
  collaborators,
  onSignOut,
}: {
  value: AccountTab;
  onChange: (value: AccountTab) => void;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  collaborators: number;
  onSignOut: () => Promise<void>;
}) {
  return (
    <section id="conta" className="mt-5 scroll-mt-24">
      <PremiumSection className="p-3 sm:p-4" accent="blue">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
              Conta e preferências
            </p>
            <h2 className="mt-1 font-display text-xl font-black text-foreground">
              Perfil, configuração e sessão
            </h2>
          </div>
          <p className="max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
            Ações de conta ficam concentradas em um único painel para não competir com a operação
            dos colaboradores.
          </p>
        </div>

        <Tabs value={value} onValueChange={(next) => onChange(next as AccountTab)} className="mt-4">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
            <AccountTabTrigger value="profile" icon={IdCard}>
              Perfil
            </AccountTabTrigger>
            <AccountTabTrigger value="settings" icon={SlidersHorizontal}>
              Preferências
            </AccountTabTrigger>
            <AccountTabTrigger value="session" icon={LogOut}>
              Sessão
            </AccountTabTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} src={avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-black text-foreground">
                      {displayName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {email ?? "E-mail não informado"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <InfoChip label="Contexto" value={role === "gestor" ? "Gestor" : "Campo"} />
                <InfoChip label="Equipe" value={`${collaborators} colaboradores`} />
                <InfoChip label="Sessão" value="Autenticada" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-3">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="min-w-0">
                  <p className="font-display text-sm font-black text-foreground">
                    Modo de visualização
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Alterna o contexto de navegação entre gestor e campo.
                  </p>
                </div>
                <RoleSwitcher />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <InfoChip label="Tema" value="Industrial Lemarc" />
                <InfoChip label="Navegação" value="Desktop e mobile" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="session" className="mt-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <p className="font-display text-sm font-black text-foreground">Sessão ativa</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Encerre o acesso deste dispositivo quando finalizar a operação.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onSignOut()}
                className="lemarc-pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.055] px-4 font-display text-xs font-black uppercase tracking-[0.14em] text-slate-100 hover:border-rose-300/35 hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
              >
                <LogOut size={16} />
                Encerrar sessão
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </PremiumSection>
    </section>
  );
}

function AccountTabTrigger({
  value,
  icon: Icon,
  children,
}: {
  value: AccountTab;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="min-h-10 rounded-xl px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_12px_26px_-18px_var(--primary)]"
    >
      <Icon size={14} className="mr-1.5" />
      {children}
    </TabsTrigger>
  );
}

function KineticPanel({
  as = "div",
  children,
  className,
  accent = "orange",
  maxRotate = 2,
  lift = -2,
}: {
  as?: "div" | "section";
  children: ReactNode;
  className?: string;
  accent?: keyof typeof toneConfig;
  maxRotate?: number;
  lift?: number;
}) {
  const physics = usePhysicsCard<HTMLDivElement>({
    maxRotate,
    mobileMaxRotate: 0.4,
    lift,
    perspective: 1400,
  });
  const Component = as;

  return (
    <Component
      ref={physics.ref}
      className={cn("lemarc-kinetic-card relative", className)}
      style={{ ...physics.style, ...surfaceVars(accent) }}
      data-kinetic-active={physics.active}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" aria-hidden />
      {children}
    </Component>
  );
}

function PremiumSection({
  children,
  className,
  accent = "orange",
}: {
  children: ReactNode;
  className?: string;
  accent?: keyof typeof toneConfig;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.45rem] border border-white/[0.13] bg-[linear-gradient(145deg,oklch(0.29_0.046_252/0.94),oklch(0.13_0.036_252/0.91))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_28px_64px_-42px_rgba(0,0,0,0.92)]",
        className,
      )}
      style={surfaceVars(accent)}
    >
      <div
        aria-hidden
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent"
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px] bg-[var(--lemarc-card-accent)] opacity-80 shadow-[0_0_20px_var(--lemarc-card-glow)]"
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  tone = "steel",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: keyof typeof toneConfig;
}) {
  const config = toneConfig[tone];
  return (
    <div className="min-w-[8.75rem] rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
          {label}
        </span>
        <Icon size={14} style={{ color: config.accent }} />
      </div>
      <p className="mt-1.5 truncate font-display text-xl font-black leading-none text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  muted,
}: {
  label: string;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.11em] text-slate-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate font-display text-[13px] font-black leading-tight tabular-nums",
          muted ? "text-slate-400" : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: CollaboratorOperationalStatus }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}

function HistoryChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/[0.075] bg-white/[0.035] px-2 text-[10px] font-bold text-slate-400">
      <Icon size={12} className="text-primary" />
      {children}
    </span>
  );
}

function PanelButton({
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="lemarc-pressable inline-flex min-h-10 items-center gap-2 rounded-2xl border border-white/[0.11] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/35 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const classes = {
    sm: "size-9 text-[10px] rounded-xl",
    md: "size-11 text-xs rounded-2xl",
    lg: "size-14 text-sm rounded-2xl",
  }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 border border-white/20 object-cover shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)]",
          classes,
        )}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center border border-primary/35 bg-primary/14 font-display font-black uppercase text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_12px_24px_-18px_var(--primary)]",
        classes,
      )}
    >
      {initials(name)}
    </span>
  );
}

function CompactEmpty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.025] p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-primary">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-sm font-black text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{text}</span>
      </span>
    </div>
  );
}

function EmptyCollaborators() {
  return (
    <div className="mt-4">
      <CompactEmpty
        icon={Users}
        title="Nenhum colaborador cadastrado"
        text="Assim que técnicos forem adicionados ao cadastro, este painel exibirá status, horas, serviços e valores apurados."
      />
    </div>
  );
}

function MaisSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="relative mt-2 min-h-[13rem] overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-[#0a0f1d] p-5">
        <div className="lemarc-shimmer absolute inset-0 opacity-20" />
        <div className="relative space-y-3">
          <div className="h-3 w-44 rounded-full bg-white/[0.08]" />
          <div className="h-8 w-24 rounded-xl bg-white/[0.08]" />
          <div className="h-4 w-full max-w-md rounded-full bg-white/[0.06]" />
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="h-16 rounded-2xl bg-white/[0.05]" />
            <div className="h-16 rounded-2xl bg-white/[0.05]" />
            <div className="h-16 rounded-2xl bg-white/[0.05]" />
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-16 rounded-2xl bg-white/[0.35]" />
        ))}
      </div>
    </div>
  );
}

function MaisError({ error }: { error: Error }) {
  return (
    <AppShell title="Mais">
      <PremiumSection className="mx-auto mt-2 max-w-3xl p-6 text-center" accent="red">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-300/30 bg-rose-400/10 text-rose-200">
          <Activity size={24} />
        </div>
        <h1 className="mt-4 font-display text-xl font-black text-foreground">
          Não foi possível carregar a central
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          A consulta de colaboradores, OS ou apontamentos não respondeu como esperado.
        </p>
        <p className="mx-auto mt-3 max-w-lg rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs text-muted-foreground">
          {error.message}
        </p>
      </PremiumSection>
    </AppShell>
  );
}

function formatCurrencyOrPending(valueCents: number | null) {
  if (!valueCents || valueCents <= 0) return "Valor ainda não apurado";
  return currency.format(valueCents / 100);
}

function formatCurrencyCompact(valueCents: number | null) {
  if (!valueCents || valueCents <= 0) return "A apurar";
  return currency.format(valueCents / 100);
}

function emptyAwareNumber(value: number) {
  return value > 0 ? value : "Nenhuma";
}

function formatDate(value: string) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Data não informada";
  return dateFormatter.format(parsed).replace(".", "");
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return letters || "LM";
}

function surfaceVars(accent: keyof typeof toneConfig): CSSProperties {
  const tone = toneConfig[accent];
  return {
    "--lemarc-card-accent": tone.accent,
    "--lemarc-card-glow": tone.glow,
  } as CSSProperties;
}

const toneConfig = {
  orange: { accent: "var(--primary)", glow: "oklch(0.72 0.19 50 / 0.52)" },
  blue: { accent: "var(--status-transit)", glow: "oklch(0.7 0.15 230 / 0.4)" },
  steel: { accent: "var(--status-pending)", glow: "oklch(0.72 0.025 250 / 0.28)" },
  amber: { accent: "var(--status-review)", glow: "oklch(0.78 0.16 90 / 0.38)" },
  green: { accent: "var(--status-done)", glow: "oklch(0.7 0.16 155 / 0.36)" },
  red: { accent: "var(--destructive)", glow: "oklch(0.62 0.22 25 / 0.44)" },
} as const;
