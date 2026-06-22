import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Phone, Mail, Plus, ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/app/GlassCard";
import { maskCNPJ } from "@/lib/cnpj";
import type { ClientFull } from "@/types/client";
import { cn } from "@/lib/utils";

export type ClientCardProps = {
  client: ClientFull;
  unitCount: number;
  osOpen: number;
  osDone: number;
};

export function ClientCard({ client, unitCount, osOpen, osDone }: ClientCardProps) {
  const initials = client.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <GlassCard className="lemarc-pressable group relative overflow-hidden p-5 transition hover:-translate-y-0.5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 font-display text-sm font-black text-primary ring-1 ring-primary/30">
          {initials || "—"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-black text-foreground">
                {client.name}
              </h3>
              {client.cnpj && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  CNPJ {maskCNPJ(client.cnpj)}
                </p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                client.active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-white/10 text-muted-foreground",
              )}
            >
              {client.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          {client.segment && (
            <p className="mt-1 text-xs text-muted-foreground">{client.segment}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="Unidades" value={unitCount} />
        <Mini label="OS abertas" value={osOpen} accent={osOpen > 0} />
        <Mini label="Concluídas" value={osDone} />
      </div>

      <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
        {(client.city || client.state) && (
          <Row icon={MapPin}>
            {[client.city, client.state].filter(Boolean).join(" / ")}
          </Row>
        )}
        {client.responsible_name && (
          <Row icon={Building2}>{client.responsible_name}</Row>
        )}
        {client.phone && <Row icon={Phone}>{client.phone}</Row>}
        {client.email && <Row icon={Mail}>{client.email}</Row>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <Link
          to="/ordens/nova"
          search={{ clientId: client.id } as never}
          className="flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-primary transition hover:bg-primary/25"
        >
          <Plus size={12} /> Nova OS
        </Link>
        <Link
          to="/clientes/$id"
          params={{ id: client.id }}
          className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-foreground/80 transition hover:text-primary"
        >
          Detalhes <ArrowRight size={12} />
        </Link>
      </div>
    </GlassCard>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-center",
        accent
          ? "border-primary/30 bg-primary/10"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div
        className={cn(
          "font-display text-lg font-black",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className="text-primary" />
      <span className="truncate">{children}</span>
    </div>
  );
}