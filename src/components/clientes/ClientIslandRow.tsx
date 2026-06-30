import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ExternalLink,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Plus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { maskCNPJ } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientFull, ClientUnit } from "@/types/client";
import type { ServiceOrder } from "@/types/serviceOrder";

export type ClientIslandRowProps = {
  client: ClientFull;
  units: ClientUnit[];
  osOpen: number;
  osDone: number;
  lastOrder?: ServiceOrder | null;
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "--"
  );
}

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function ClientIslandRow({
  client,
  units,
  osOpen,
  osDone,
  lastOrder,
}: ClientIslandRowProps) {
  const [expanded, setExpanded] = useState(false);
  const cnpjMasked = client.cnpj ? maskCNPJ(client.cnpj) : null;
  const hasContact = Boolean(client.responsible_name || client.phone || client.email);
  const unitCount = units.length;
  const pendencies: string[] = [];
  if (!client.cnpj) pendencies.push("CNPJ");
  if (!hasContact) pendencies.push("Contato");
  if (unitCount === 0) pendencies.push("Unidade");
  const location = [client.city, client.state].filter(Boolean).join("/");
  const lastOrderLabel = lastOrder
    ? `OS #${lastOrder.number} · ${formatShortDate(lastOrder.opened_at) ?? "-"}`
    : "Sem OS";

  return (
    <article
      className={cn(
        "lemarc-island-row group/client",
        expanded && "lemarc-island-row-expanded",
        !client.active && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:grid-cols-[auto_minmax(0,1.6fr)_auto_auto_auto_auto_minmax(0,1fr)_auto]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/14 font-display text-[11px] font-black uppercase text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          {initials(client.name)}
        </span>

        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-black leading-tight text-white">
            {client.name || "Empresa sem nome"}
          </span>
          <span className="mt-0.5 hidden truncate text-[12px] font-semibold text-slate-300 md:block">
            {cnpjMasked ? <span className="font-mono">{cnpjMasked}</span> : <span className="text-amber-200">CNPJ pendente</span>}
            {client.segment && <span className="text-slate-500"> · {client.segment}</span>}
            {location && <span className="text-slate-500"> · {location}</span>}
          </span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 md:hidden">
            <StatusPill active={client.active} />
            <span className="truncate text-[11px] font-semibold text-slate-300">
              {cnpjMasked ?? "CNPJ pendente"}
            </span>
          </span>
          <span className="mt-1 block truncate text-[11px] font-bold tabular-nums text-slate-200 md:hidden">
            {unitCount} un · {osOpen} OS abertas · {osDone} concluídas
          </span>
        </span>

        <StatusPill active={client.active} desktopOnly />
        <Metric label="Unidades" value={String(unitCount)} />
        <Metric label="OS abertas" value={String(osOpen)} accent={osOpen > 0} />
        <Metric label="Concluídas" value={String(osDone)} />

        <span className="hidden min-w-0 truncate text-[11px] font-semibold text-slate-400 md:block">
          {lastOrderLabel}
        </span>

        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.045] text-primary transition group-hover/client:border-primary/35">
          <ChevronDown
            size={16}
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
          />
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-4 border-t border-white/[0.08] pt-4">
            <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Detail label="CNPJ" value={cnpjMasked ?? "Pendente"} strong={!cnpjMasked} tone={!cnpjMasked ? "warn" : undefined} />
              <Detail label="Segmento" value={client.segment ?? "Não informado"} />
              <Detail label="Cidade/UF" value={location || "Não informado"} />
              <Detail label="Responsável" value={client.responsible_name ?? "Não informado"} />
              <Detail label="Telefone" value={client.phone ?? "Não informado"} />
              <Detail label="E-mail" value={client.email ?? "Não informado"} />
              <Detail label="OS abertas" value={String(osOpen)} strong={osOpen > 0} />
              <Detail label="OS concluídas" value={String(osDone)} />
              {client.notes && <Detail label="Observações" value={client.notes} wide />}
            </dl>

            <div className="mt-4">
              <p className="lemarc-technical-label flex items-center gap-1.5">
                <Building2 size={12} /> Unidades ({unitCount})
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {units.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-400/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100">
                    <AlertTriangle size={11} /> Sem unidades cadastradas
                  </span>
                ) : (
                  units.map((u) => (
                    <span
                      key={u.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                        u.is_primary
                          ? "border-primary/40 bg-primary/12 text-primary"
                          : "border-white/10 bg-white/[0.05] text-slate-200",
                      )}
                      title={[u.city, u.state].filter(Boolean).join("/") || undefined}
                    >
                      {u.is_primary && <span className="text-[8px] uppercase tracking-wider">★</span>}
                      {u.name}
                      {(u.city || u.state) && (
                        <span className="text-slate-400 font-semibold">
                          · {[u.city, u.state].filter(Boolean).join("/")}
                        </span>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>

            {pendencies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pendencies.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-amber-100"
                  >
                    <AlertTriangle size={10} /> {p} pendente
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
              <ActionLink to="/ordens/nova" search={{ clientId: client.id }} icon={Plus} primary>
                Nova OS
              </ActionLink>
              <ActionLink to="/clientes/$id" params={{ id: client.id }} icon={UserRound}>
                Detalhes
              </ActionLink>
              <ActionLink to="/clientes/$id/editar" params={{ id: client.id }} icon={PenLine}>
                Editar
              </ActionLink>
              {client.phone && (
                <ActionExternal href={`tel:${client.phone}`} icon={Phone}>
                  Ligar
                </ActionExternal>
              )}
              {client.email && (
                <ActionExternal href={`mailto:${client.email}`} icon={Mail}>
                  E-mail
                </ActionExternal>
              )}
              {lastOrder && (
                <ActionLink to="/ordens/$id" params={{ id: lastOrder.id }} icon={ExternalLink}>
                  Última OS
                </ActionLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ active, desktopOnly }: { active: boolean; desktopOnly?: boolean }) {
  return (
    <span
      className={cn(
        "w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]",
        desktopOnly ? "hidden md:inline-flex" : "inline-flex",
        active
          ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-200"
          : "border-zinc-400/35 bg-zinc-400/10 text-zinc-300",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="hidden min-w-0 md:block">
      <span className="lemarc-technical-label block">{label}</span>
      <span
        className={cn(
          "mt-0.5 block truncate font-display text-[13px] font-black tabular-nums",
          accent ? "text-primary" : "text-white",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function Detail({
  label,
  value,
  strong,
  wide,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  wide?: boolean;
  tone?: "warn";
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5",
        wide && "sm:col-span-2 xl:col-span-4",
      )}
    >
      <dt className="lemarc-technical-label">{label}</dt>
      <dd
        className={cn(
          "mt-1 min-w-0 break-words text-[13px] font-semibold leading-snug text-slate-200",
          strong && "font-display font-black text-white",
          tone === "warn" && "text-amber-200",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function ActionLink({
  to,
  params,
  search,
  icon: Icon,
  children,
  primary,
}: {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  icon: LucideIcon;
  children: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      search={search as never}
      className={cn(
        "lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-[10px] font-black uppercase tracking-[0.12em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
        primary
          ? "lemarc-primary-action text-[color:var(--primary-foreground)]"
          : "border-white/[0.12] bg-white/[0.055] text-slate-200 hover:border-primary/40 hover:bg-primary/12",
      )}
    >
      <Icon size={14} />
      {children}
    </Link>
  );
}

function ActionExternal({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: string;
}) {
  return (
    <a
      href={href}
      className="lemarc-pressable inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/40 hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
    >
      <Icon size={14} />
      {children}
    </a>
  );
}