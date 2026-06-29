import { Suspense, useMemo, type CSSProperties, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  CalendarClock,
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
  const { displayName, email, avatarUrl, signOut } = useAuth();
  const { role } = useRole();
  const { data: orders } = useServiceOrdersQuery();
  const { data: technicians } = useTechniciansQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();

  const dashboard = useMemo(
    () =>
      buildCollaboratorOperationalDashboard({
        technicians,
        orders,
        laborHistory,
      }),
    [laborHistory, orders, technicians],
  );

  const firstName = displayName.split(" ")[0] || "Operação";
  const openOrders = dashboard.collaborators.reduce((total, item) => total + item.ordersOpen, 0);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <>
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

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ActionTile
          icon={Users}
          label="Colaboradores"
          description="Equipe, disponibilidade, horas e histórico de OS."
          meta={`${dashboard.kpis.total} no cadastro`}
          accent="orange"
          onClick={() => scrollTo("colaboradores")}
        />
        <ActionTile
          icon={UserRound}
          label="Perfil"
          description="Dados da conta autenticada e contexto atual."
          meta={displayName}
          accent="blue"
          onClick={() => scrollTo("perfil")}
        />
        <ActionTile
          icon={Settings}
          label="Configurações"
          description="Preferências disponíveis para a operação."
          meta={role === "gestor" ? "Gestor" : "Campo"}
          accent="steel"
          onClick={() => scrollTo("configuracoes")}
        />
        <ContextModeTile />
        <ActionTile
          icon={LogOut}
          label="Encerrar sessão"
          description="Finaliza o acesso neste dispositivo."
          meta="Conta"
          accent="red"
          onClick={handleSignOut}
        />
      </section>

      <CollaboratorsSection dashboard={dashboard} />

      <section id="perfil" className="mt-6 grid gap-3 xl:grid-cols-[1fr_1fr]">
        <ProfilePanel
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          role={role}
          collaborators={dashboard.kpis.total}
        />
        <SettingsPanel role={role} onSignOut={handleSignOut} />
      </section>
    </>
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
    <section className="group relative mt-2 overflow-hidden rounded-3xl border border-white/[0.11] bg-[#0a0f1d] text-white shadow-[0_30px_70px_-34px_rgba(0,0,0,0.95)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-primary/[0.09] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-sky-400/[0.055] blur-3xl"
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/90">
              Central operacional complementar
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-black leading-none tracking-tight sm:text-4xl">
            Mais
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Central de apoio para equipe, conta e preferências. Aqui o cadastro de técnicos conversa
            com as OS, horas apontadas e valores apurados.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <HeroStat icon={HardHat} label="Colaboradores" value={collaborators} />
            <HeroStat icon={ClipboardList} label="OS abertas" value={openOrders} />
            <HeroStat icon={Clock3} label="Horas no mês" value={formatMinutesShort(monthHours)} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} src={avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-black">{displayName}</p>
              <p className="truncate text-xs font-medium text-slate-300">
                {email ?? "E-mail não informado"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <InfoChip label="Contexto" value={role === "gestor" ? "Gestor" : "Campo"} />
            <InfoChip label="Conta" value={firstName} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof HardHat;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.075] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        <Icon size={14} className="text-primary" />
      </div>
      <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums">{value}</p>
    </div>
  );
}

function CollaboratorsSection({
  dashboard,
}: {
  dashboard: ReturnType<typeof buildCollaboratorOperationalDashboard>;
}) {
  return (
    <section id="colaboradores" className="mt-6 scroll-mt-24">
      <div className="mb-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Dados operacionais conectados
          </p>
          <h2 className="mt-1 font-display text-xl font-black text-[color:var(--on-app-bg)]">
            Colaboradores
          </h2>
        </div>
        <p className="max-w-xl text-xs font-medium leading-relaxed text-[color:var(--on-app-bg-muted)]">
          Disponibilidade derivada das OS vinculadas; horas e valores vêm dos apontamentos
          financeiros, com fallback para OS finalizadas quando houver dados legados.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <KpiTile icon={Users} label="Total" value={dashboard.kpis.total} />
        <KpiTile icon={Activity} label="Em campo" value={dashboard.kpis.inField} tone="orange" />
        <KpiTile
          icon={ShieldCheck}
          label="Disponíveis"
          value={dashboard.kpis.available}
          tone="green"
        />
        <KpiTile
          icon={CalendarClock}
          label="Deslocamento"
          value={dashboard.kpis.inTransit}
          tone="blue"
        />
        <KpiTile
          icon={Clock3}
          label="Horas no mês"
          value={formatMinutesShort(dashboard.kpis.hoursMonthMinutes)}
          tone="steel"
        />
        <KpiTile
          icon={Briefcase}
          label="Serviços no mês"
          value={dashboard.kpis.completedMonth}
          tone="amber"
        />
      </div>

      {dashboard.collaborators.length === 0 ? (
        <EmptyCollaborators />
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {dashboard.collaborators.map((collaborator) => (
            <CollaboratorCard key={collaborator.id} collaborator={collaborator} />
          ))}
        </div>
      )}
    </section>
  );
}

function CollaboratorCard({ collaborator }: { collaborator: CollaboratorSummary }) {
  return (
    <KineticSurface className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Avatar name={collaborator.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate font-display text-base font-black leading-tight text-foreground">
              {collaborator.name}
            </h3>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]",
                statusStyles[collaborator.status],
              )}
            >
              {collaborator.status}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
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
          className="lemarc-pressable grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.055] text-primary hover:border-primary/45 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          aria-label={`Ver OS de ${collaborator.name}`}
        >
          <ArrowUpRight size={17} />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <MiniMetric label="OS abertas" value={collaborator.ordersOpen} />
        <MiniMetric label="OS hoje" value={collaborator.ordersToday} />
        <MiniMetric label="Horas mês" value={formatMinutesShort(collaborator.hoursMonthMinutes)} />
        <MiniMetric label="Serviços" value={collaborator.servicesMonth} />
        <MiniMetric label="Valor" value={formatCurrencyOrPending(collaborator.valueMonthCents)} />
      </div>

      <Accordion type="single" collapsible className="mt-4">
        <AccordionItem value="history" className="border-white/[0.075]">
          <AccordionTrigger className="py-3 text-left font-display text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground hover:no-underline data-[state=open]:text-foreground">
            Histórico resumido
          </AccordionTrigger>
          <AccordionContent className="pb-0">
            {collaborator.history.length > 0 ? (
              <div className="space-y-2">
                {collaborator.history.map((item) => (
                  <HistoryRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <InlineEmpty
                title="Sem histórico recente"
                text="Nenhuma OS finalizada ou apontamento de horas vinculado a este colaborador ainda."
              />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </KineticSurface>
  );
}

function HistoryRow({ item }: { item: CollaboratorHistoryItem }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-black text-foreground">
            {item.orderNumber ? `OS #${item.orderNumber}` : "OS"} · {item.title}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.clientName}
            {item.unitName ? ` · ${item.unitName}` : ""} · {item.serviceLabel}
          </p>
        </div>
        <Link
          to="/ordens/$id"
          params={{ id: item.orderId }}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-primary hover:border-primary/40"
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
        <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/85">
          {item.description}
        </p>
      )}
    </div>
  );
}

function ProfilePanel({
  displayName,
  email,
  avatarUrl,
  role,
  collaborators,
}: {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  collaborators: number;
}) {
  return (
    <KineticSurface className="p-5">
      <PanelHeader icon={IdCard} eyebrow="Perfil" title="Conta e contexto" />
      <div className="mt-4 flex items-center gap-3">
        <Avatar name={displayName} src={avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-black text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            {email ?? "E-mail não informado"}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <InfoChip label="Visualização" value={role === "gestor" ? "Gestor" : "Campo"} />
        <InfoChip label="Equipe" value={`${collaborators} colaboradores`} />
        <InfoChip label="Sessão" value="Autenticada" />
      </div>
    </KineticSurface>
  );
}

function SettingsPanel({ role, onSignOut }: { role: string; onSignOut: () => void }) {
  return (
    <KineticSurface id="configuracoes" className="scroll-mt-24 p-5">
      <PanelHeader icon={SlidersHorizontal} eyebrow="Configurações" title="Preferências ativas" />
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.075] bg-white/[0.035] p-3">
          <div className="min-w-0">
            <p className="font-display text-sm font-black text-foreground">Modo de visualização</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Contexto atual: {role === "gestor" ? "gestor" : "campo"}.
            </p>
          </div>
          <RoleSwitcher />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <InfoChip label="Tema" value="Industrial Lemarc" />
          <InfoChip label="Navegação" value="Desktop e mobile" />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="lemarc-pressable flex w-full items-center justify-between rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-left text-rose-100 hover:border-rose-300/45 hover:bg-rose-400/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
        >
          <span className="flex items-center gap-2 font-display text-xs font-black uppercase tracking-[0.14em]">
            <LogOut size={16} />
            Encerrar sessão
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    </KineticSurface>
  );
}

function ActionTile({
  icon: Icon,
  label,
  description,
  meta,
  accent,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  description: string;
  meta: string;
  accent: "orange" | "blue" | "steel" | "red";
  onClick: () => void;
}) {
  const tone = toneConfig[accent];
  const physics = usePhysicsCard<HTMLButtonElement>({
    maxRotate: 2.6,
    mobileMaxRotate: 0.6,
    lift: -2,
    perspective: 1300,
  });

  return (
    <button
      ref={physics.ref}
      type="button"
      onClick={onClick}
      className="lemarc-kinetic-card group relative min-h-[9.25rem] overflow-hidden rounded-[1.4rem] border border-white/[0.075] bg-[linear-gradient(145deg,oklch(0.27_0.045_252/0.93),oklch(0.14_0.036_252/0.9))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_18px_42px_-28px_rgba(0,0,0,0.85)] outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
      style={
        {
          ...physics.style,
          "--lemarc-card-accent": tone.accent,
          "--lemarc-card-glow": tone.glow,
        } as CSSProperties
      }
      data-kinetic-active={physics.active}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" aria-hidden />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <span className="lemarc-icon-orb grid size-11 place-items-center rounded-2xl">
            <Icon size={19} />
          </span>
          <ChevronRight
            size={17}
            className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </div>
        <div className="mt-4 min-w-0">
          <p className="font-display text-sm font-black uppercase tracking-[0.12em] text-foreground">
            {label}
          </p>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <p className="mt-auto pt-3 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
          {meta}
        </p>
      </div>
    </button>
  );
}

function ContextModeTile() {
  const { role } = useRole();
  return (
    <KineticSurface className="min-h-[9.25rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="lemarc-icon-orb grid size-11 place-items-center rounded-2xl">
          <ShieldCheck size={19} />
        </span>
        <RoleSwitcher />
      </div>
      <p className="mt-4 font-display text-sm font-black uppercase tracking-[0.12em] text-foreground">
        Modo de visualização
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Alterna o contexto de navegação entre gestor e campo.
      </p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
        {role === "gestor" ? "Gestor" : "Campo"}
      </p>
    </KineticSurface>
  );
}

function KineticSurface({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const physics = usePhysicsCard<HTMLDivElement>({
    maxRotate: 2.4,
    mobileMaxRotate: 0.55,
    lift: -2,
    perspective: 1300,
  });

  return (
    <div
      id={id}
      ref={physics.ref}
      className={cn("lemarc-kinetic-card lemarc-card-shell", className)}
      style={physics.style}
      data-kinetic-active={physics.active}
      {...physics.handlers}
    >
      <div className="lemarc-card-glare" aria-hidden />
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
  icon: typeof Users;
  label: string;
  value: ReactNode;
  tone?: "orange" | "blue" | "steel" | "amber" | "green";
}) {
  const config = toneConfig[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(145deg,oklch(0.27_0.045_252/0.93),oklch(0.15_0.036_252/0.9))] p-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_15px_32px_-24px_rgba(0,0,0,0.85)]">
      <div
        aria-hidden
        className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full"
        style={{ background: config.accent, boxShadow: `0 0 18px ${config.glow}` }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
        <Icon size={15} style={{ color: config.accent }} />
      </div>
      <p className="mt-2 font-display text-2xl font-black leading-none tabular-nums">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-h-[4.25rem] rounded-2xl border border-white/[0.065] bg-white/[0.032] p-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words font-display text-sm font-black leading-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.075] bg-white/[0.035] px-3 py-2">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function HistoryChip({ icon: Icon, children }: { icon: typeof Clock3; children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/[0.075] bg-white/[0.035] px-2 text-[10px] font-bold text-muted-foreground">
      <Icon size={12} className="text-primary" />
      {children}
    </span>
  );
}

function PanelHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof Users;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="lemarc-icon-orb grid size-11 place-items-center rounded-2xl">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 font-display text-lg font-black text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "md" | "lg";
}) {
  const classes = size === "lg" ? "size-14 text-sm" : "size-12 text-xs";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 rounded-2xl border border-white/20 object-cover shadow-[0_12px_26px_-18px_rgba(0,0,0,0.9)]",
          classes,
        )}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className={cn(
        "lemarc-icon-orb grid shrink-0 place-items-center rounded-2xl font-display font-black uppercase",
        classes,
      )}
    >
      {initials(name)}
    </span>
  );
}

function InlineEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.11] bg-white/[0.025] p-4 text-center">
      <p className="font-display text-sm font-black text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function EmptyCollaborators() {
  return (
    <div className="mt-4">
      <KineticSurface className="p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Users size={24} />
        </div>
        <h3 className="mt-4 font-display text-lg font-black text-foreground">
          Nenhum colaborador cadastrado
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Assim que técnicos forem adicionados ao cadastro, este painel passa a exibir status,
          horas, serviços e valores apurados.
        </p>
      </KineticSurface>
    </div>
  );
}

function MaisSkeleton() {
  return (
    <div className="mt-2 space-y-4">
      <div className="relative min-h-[18rem] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0f1d] p-5">
        <div className="lemarc-shimmer absolute inset-0 opacity-20" />
        <div className="relative space-y-4">
          <div className="h-3 w-44 rounded-full bg-white/[0.08]" />
          <div className="h-10 w-28 rounded-xl bg-white/[0.08]" />
          <div className="h-4 w-full max-w-lg rounded-full bg-white/[0.06]" />
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="h-20 rounded-2xl bg-white/[0.05]" />
            <div className="h-20 rounded-2xl bg-white/[0.05]" />
            <div className="h-20 rounded-2xl bg-white/[0.05]" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-[1.4rem] bg-white/[0.35]" />
        ))}
      </div>
    </div>
  );
}

function MaisError({ error }: { error: Error }) {
  return (
    <AppShell title="Mais">
      <KineticSurface className="mt-2 p-6 text-center">
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
      </KineticSurface>
    </AppShell>
  );
}

function formatCurrencyOrPending(valueCents: number | null) {
  if (!valueCents || valueCents <= 0) return "Valor ainda não apurado";
  return currency.format(valueCents / 100);
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

const toneConfig = {
  orange: { accent: "var(--primary)", glow: "oklch(0.72 0.19 50 / 0.52)" },
  blue: { accent: "var(--status-transit)", glow: "oklch(0.7 0.15 230 / 0.4)" },
  steel: { accent: "var(--status-pending)", glow: "oklch(0.72 0.025 250 / 0.28)" },
  amber: { accent: "var(--status-review)", glow: "oklch(0.78 0.16 90 / 0.38)" },
  green: { accent: "var(--status-done)", glow: "oklch(0.7 0.16 155 / 0.36)" },
  red: { accent: "var(--destructive)", glow: "oklch(0.62 0.22 25 / 0.44)" },
} as const;
