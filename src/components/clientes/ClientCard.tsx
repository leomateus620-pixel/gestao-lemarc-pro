import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Factory,
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
    maxRotate: 4,
    mobileMaxRotate: 1.2,
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
      className="group/client lemarc-kinetic-card relative overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-[linear-gradient(145deg,oklch(0.285_0.043_252/0.92),oklch(0.145_0.038_252/0.88))] p-4 shadow-[inset_0_1px_0_oklch(1_0_0/0.16),0_20px_44px_-25px_oklch(0_0_0/0.86),0_8px_20px_-17px_var(--lemarc-card-glow)] backdrop-blur-xl sm:p-5"
      data-kinetic-active={physics.active}
      style={style}
      {...physics.handlers}
    >
      <div aria-hidden="true" className="lemarc-card-glare" />
      <div
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lemarc-card-accent)] to-transparent opacity-70"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-full bg-[var(--lemarc-card-accent)] shadow-[0_0_20px_var(--lemarc-card-glow)]"
      />

      <div className="relative pl-2">
        <div className="flex items-start gap-3">
          <div className="grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-2xl border border-[color-mix(in_oklab,var(--lemarc-card-accent)_38%,white_8%)] bg-[radial-gradient(circle_at_30%_18%,oklch(1_0_0/0.28),transparent_28%),linear-gradient(145deg,color-mix(in_oklab,var(--lemarc-card-accent)_28%,transparent),oklch(1_0_0/0.045))] font-display text-sm font-black text-[var(--lemarc-card-accent)] shadow-[inset_0_1px_0_oklch(1_0_0/0.18),0_12px_24px_-18px_var(--lemarc-card-glow)]">
            {initials || "--"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 font-display text-base font-black leading-tight text-foreground">
                  {client.name || "Empresa sem nome"}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {client.cnpj ? (
                    <span className="font-mono text-[0.66rem] font-bold text-muted-foreground">
                      CNPJ {maskCNPJ(client.cnpj)}
                    </span>
                  ) : (
                    <SmallTag tone="pending">CNPJ pendente</SmallTag>
                  )}
                  {client.segment ? <SmallTag>{client.segment}</SmallTag> : null}
                </div>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em]",
                  client.active
                    ? "border-status-done/40 bg-status-done/[0.12] text-status-done"
                    : "border-white/10 bg-white/5 text-muted-foreground",
                )}
              >
                {client.active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <OperationalStat icon={Factory} label="Unidades" value={unitCount} />
          <OperationalStat
            icon={ClipboardList}
            label="OS abertas"
            value={osOpen}
            accent={osOpen > 0}
          />
          <OperationalStat icon={CheckCircle2} label="Concluídas" value={osDone} />
        </div>

        <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5">
          <InfoRow icon={Clock3} label="Última movimentação">
            {lastOrder ? (
              <>
                OS #{lastOrder.number}
                {latestOrderDate ? ` aberta ${latestOrderDate}` : ""}
              </>
            ) : updatedAgo ? (
              <>Cadastro atualizado {updatedAgo}</>
            ) : (
              "Sem movimentação registrada"
            )}
          </InfoRow>
        </div>

        <div className="mt-3 grid gap-2 text-[0.76rem] sm:grid-cols-2">
          {location && (
            <InfoPanel icon={MapPin} label="Cidade / UF">
              {location}
            </InfoPanel>
          )}
          {client.responsible_name && (
            <InfoPanel icon={UserRound} label="Responsável">
              {client.responsible_name}
            </InfoPanel>
          )}
          {client.phone && (
            <InfoPanel icon={Phone} label="Telefone">
              {client.phone}
            </InfoPanel>
          )}
          {client.email && (
            <InfoPanel icon={Mail} label="E-mail">
              {client.email}
            </InfoPanel>
          )}
          {!hasContact && (
            <InfoPanel icon={AlertTriangle} label="Contato">
              Dados de contato pendentes
            </InfoPanel>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
          <Link
            to="/ordens/nova"
            search={{ clientId: client.id } as never}
            className="lemarc-orange-glow inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/95 active:translate-y-0 active:scale-[0.98]"
          >
            <Plus size={13} strokeWidth={2.5} /> Nova OS
          </Link>
          <Link
            to="/clientes/$id"
            params={{ id: client.id }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.12em] text-foreground/85 transition hover:border-primary/35 hover:text-primary active:scale-[0.98]"
          >
            Detalhes <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function OperationalStat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border px-3 py-2.5 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
        accent ? "border-primary/35 bg-primary/10" : "border-white/[0.08] bg-white/[0.035]",
      )}
    >
      <Icon
        className={cn("mx-auto h-3.5 w-3.5", accent ? "text-primary" : "text-muted-foreground")}
      />
      <div
        className={cn(
          "mt-1 font-display text-xl font-black leading-none tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-[0.54rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SmallTag({ children, tone }: { children: ReactNode; tone?: "pending" }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.1em]",
        tone === "pending"
          ? "border-status-review/30 bg-status-review/10 text-status-review"
          : "border-white/[0.08] bg-white/[0.04] text-muted-foreground",
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function InfoPanel({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-[#07111f]/70 text-[var(--lemarc-card-accent)]">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.54rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <span className="block truncate font-semibold text-foreground/90">{children}</span>
      </span>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--lemarc-card-accent)]" />
      <span className="min-w-0">
        <span className="block text-[0.54rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="block truncate text-[0.76rem] font-semibold text-foreground/90">
          {children}
        </span>
      </span>
    </div>
  );
}
