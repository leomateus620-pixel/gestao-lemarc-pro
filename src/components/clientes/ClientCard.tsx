import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePhysicsCard } from "@/hooks/usePhysicsCard";
import { maskCNPJ } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientFull } from "@/types/client";
import type { ServiceOrder } from "@/types/serviceOrder";

export type ClientCardProps = {
  client: ClientFull;
  unitCount: number;
  osOpen: number;
  osDone: number;
  lastOrder?: ServiceOrder | null;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatShortDateTime(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  if (isSameDay(date, now)) return `hoje, ${formatTime(date)}`;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (diffMinutes < 2) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;

  return `há ${Math.floor(diffHours / 24)}d`;
}

export function ClientCard({ client, unitCount, osOpen, osDone, lastOrder }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const physics = usePhysicsCard<HTMLDivElement>({
    maxRotate: 3.2,
    mobileMaxRotate: 0.9,
    lift: -2,
  });
  const accentColor =
    osOpen > 0 ? "var(--primary)" : client.active ? "var(--status-done)" : "var(--status-pending)";
  const accentGlow =
    osOpen > 0
      ? "oklch(0.72 0.19 50 / 0.36)"
      : client.active
        ? "oklch(0.7 0.16 155 / 0.28)"
        : "oklch(0.72 0.025 250 / 0.24)";
  const style = {
    ...physics.style,
    "--lemarc-card-accent": accentColor,
    "--lemarc-card-glow": accentGlow,
  } as CSSProperties;
  const location = [client.city, client.state].filter(Boolean).join(" / ");
  const latestOrderDate = formatShortDateTime(lastOrder?.opened_at ?? null);
  const updatedAgo = formatRelative(client.updated_at);
  const hasContact = Boolean(client.responsible_name || client.phone || client.email);

  return (
    <article
      ref={physics.ref}
      className="group/client lemarc-kinetic-card relative overflow-hidden rounded-[1.5rem] border border-white/[0.1] bg-[linear-gradient(155deg,oklch(0.265_0.042_252/0.94),oklch(0.135_0.036_252/0.92))] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_18px_40px_-26px_oklch(0_0_0/0.85),0_6px_16px_-18px_var(--lemarc-card-glow)] backdrop-blur-xl transition-all duration-300 hover:border-[color-mix(in_oklab,var(--lemarc-card-accent)_36%,white_8%)] hover:shadow-[inset_0_1px_0_oklch(1_0_0/0.14),0_22px_46px_-24px_oklch(0_0_0/0.9),0_10px_22px_-16px_var(--lemarc-card-glow)] sm:p-5"
      data-kinetic-active={physics.active}
      style={style}
      {...physics.handlers}
    >
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className="absolute bottom-5 left-0 top-5 w-[3px] rounded-r-full bg-gradient-to-b from-[var(--lemarc-card-accent)] via-[color-mix(in_oklab,var(--lemarc-card-accent)_70%,transparent)] to-transparent shadow-[0_0_18px_var(--lemarc-card-glow)]"
      />

      <div className="relative pl-3 sm:pl-4">
        {/* Cabeçalho — perfil da empresa */}
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--lemarc-card-accent)_30%,white_6%)] bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/0.22),transparent_30%),linear-gradient(155deg,color-mix(in_oklab,var(--lemarc-card-accent)_22%,transparent),oklch(1_0_0/0.04))] font-display text-[0.95rem] font-black text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.16)]">
            {initials || "--"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-display text-[1.05rem] font-black leading-tight text-foreground sm:text-[1.15rem]">
                  {client.name || "Empresa sem nome"}
                </h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.7rem] font-semibold text-muted-foreground">
                  {client.cnpj ? (
                    <span className="font-mono">{maskCNPJ(client.cnpj)}</span>
                  ) : (
                    <span className="text-status-review/80">CNPJ pendente</span>
                  )}
                  {client.segment && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="truncate">{client.segment}</span>
                    </>
                  )}
                </p>
              </div>

              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-[0.12em]",
                  client.active
                    ? "border-status-done/40 bg-status-done/[0.12] text-status-done"
                    : "border-white/10 bg-white/5 text-muted-foreground",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                {client.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores em linha de pílulas */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
          <Metric value={unitCount} label="Unidades" />
          <span className="text-muted-foreground/30">·</span>
          <Metric value={osOpen} label="OS abertas" accent={osOpen > 0} />
          <span className="text-muted-foreground/30">·</span>
          <Metric value={osDone} label="Concluídas" />
        </div>

        {/* Lista compacta de info — divisores finos */}
        <div className="mt-3 divide-y divide-white/[0.05] border-y border-white/[0.05]">
          <InfoLine icon={Clock3} highlighted>
            {lastOrder ? (
              <>
                <span className="text-foreground">
                  Última: OS #{lastOrder.number}
                </span>
                {latestOrderDate ? (
                  <span className="text-muted-foreground"> · aberta {latestOrderDate}</span>
                ) : null}
              </>
            ) : updatedAgo ? (
              <>Cadastro atualizado {updatedAgo}</>
            ) : (
              <span className="text-muted-foreground">Sem movimentação registrada</span>
            )}
          </InfoLine>
          {(location || client.responsible_name) && (
            <div className="grid gap-1.5 py-2 sm:grid-cols-2 sm:gap-x-5">
              {location && <InfoCell icon={MapPin}>{location}</InfoCell>}
              {client.responsible_name && (
                <InfoCell icon={UserRound}>{client.responsible_name}</InfoCell>
              )}
            </div>
          )}
          {(client.phone || client.email) && (
            <div className="grid gap-1.5 py-2 sm:grid-cols-2 sm:gap-x-5">
              {client.phone && <InfoCell icon={Phone}>{client.phone}</InfoCell>}
              {client.email && (
                <InfoCell icon={Mail}>
                  <span className="truncate">{client.email}</span>
                </InfoCell>
              )}
            </div>
          )}
          {!hasContact && !location && (
            <InfoLine icon={AlertTriangle} tone="warn">
              Dados de contato pendentes
            </InfoLine>
          )}
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-2 pt-1">
          <Link
            to="/ordens/nova"
            search={{ clientId: client.id } as never}
            className="lemarc-orange-glow inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/95 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus size={12} strokeWidth={2.6} /> Nova OS
          </Link>
          <Link
            to="/clientes/$id"
            params={{ id: client.id }}
            className="group/details inline-flex min-h-9 items-center gap-1 rounded-xl px-2 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-foreground/75 transition hover:text-primary"
          >
            Detalhes
            <ArrowRight
              size={13}
              className="transition-transform group-hover/details:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Metric({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5 min-w-0">
      <span
        className={cn(
          "font-display text-lg font-black leading-none tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}

function InfoLine({
  icon: Icon,
  children,
  highlighted,
  tone,
}: {
  icon: LucideIcon;
  children: ReactNode;
  highlighted?: boolean;
  tone?: "warn";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 py-2">
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          tone === "warn"
            ? "text-status-review"
            : highlighted
              ? "text-[var(--lemarc-card-accent)]"
              : "text-muted-foreground/70",
        )}
      />
      <span
        className={cn(
          "min-w-0 truncate text-[0.78rem]",
          highlighted ? "font-semibold text-foreground/90" : "text-muted-foreground",
          tone === "warn" && "text-status-review",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <span className="min-w-0 truncate text-[0.78rem] text-foreground/85">{children}</span>
    </div>
  );
}

