import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { RoleSwitcher } from "@/components/app/RoleSwitcher";
import { colaboradores, type Colaborador } from "@/lib/mock/collaborators";
import { ChevronRight, HardHat, LogOut, Settings, UserRound, Users } from "lucide-react";

export const Route = createFileRoute("/_app/colaboradores")({
  head: () => ({ meta: [{ title: "Mais — Gestão Lemarc" }] }),
  component: Mais,
});

const statusStyles: Record<Colaborador["status"], string> = {
  "Disponível": "bg-status-done/15 text-status-done border-status-done/30",
  "Em campo": "bg-status-running/15 text-status-running border-status-running/40",
  "Em deslocamento": "bg-status-transit/15 text-status-transit border-status-transit/30",
  Folga: "bg-secondary text-muted-foreground border-border",
};

function Mais() {
  return (
    <AppShell title="Mais">
      <GlassCard className="industrial-gradient mt-2 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Central de operação</p>
        <h1 className="mt-1 font-display text-2xl font-black text-foreground">Equipe, perfil e demo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso rápido a recursos mockados da v1 sem adicionar menus ao campo.</p>
      </GlassCard>

      <div className="mt-4 space-y-2">
        <MenuItem icon={Users} label="Colaboradores" description="Equipe técnica e disponibilidade" />
        <MenuItem icon={UserRound} label="Perfil" description="Dados do usuário logado (mock)" />
        <MenuItem icon={Settings} label="Configurações mock" description="Preferências futuras do aplicativo" />
        <GlassCard className="flex items-center justify-between p-4">
          <div>
            <div className="font-display text-sm font-black uppercase tracking-wider text-foreground">Alternar perfil demo</div>
            <p className="mt-1 text-xs text-muted-foreground">Troque entre Gestor e Colaborador.</p>
          </div>
          <RoleSwitcher />
        </GlassCard>
        <Link to="/login" className="block">
          <GlassCard className="flex items-center justify-between border-destructive/25 bg-destructive/10 p-4 text-destructive">
            <div className="flex items-center gap-3"><LogOut size={18} /><span className="font-display text-sm font-black uppercase tracking-wider">Sair mock</span></div>
            <ChevronRight size={18} />
          </GlassCard>
        </Link>
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2 px-1"><HardHat size={15} className="text-primary" /><h2 className="section-title">Colaboradores</h2></div>
        <div className="grid grid-cols-3 gap-2">
          <Mini label="Total" value={colaboradores.length} />
          <Mini label="Em campo" value={colaboradores.filter((c) => c.status === "Em campo").length} />
          <Mini label="Livres" value={colaboradores.filter((c) => c.status === "Disponível").length} />
        </div>
        <div className="mt-3 space-y-3">
          {colaboradores.map((c) => <CollaboratorCard key={c.id} c={c} />)}
        </div>
      </section>
    </AppShell>
  );
}

function MenuItem({ icon: Icon, label, description }: { icon: typeof Users; label: string; description: string }) {
  return <GlassCard className="flex items-center gap-3 p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Icon size={18} /></div><div className="min-w-0 flex-1"><div className="font-display text-sm font-black uppercase tracking-wider text-foreground">{label}</div><p className="mt-0.5 text-xs text-muted-foreground">{description}</p></div><ChevronRight className="text-muted-foreground" size={18} /></GlassCard>;
}

function CollaboratorCard({ c }: { c: Colaborador }) {
  return <GlassCard className="p-4"><div className="flex items-center gap-3"><div className="relative shrink-0"><div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/25 to-primary/5 font-display text-sm font-black text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground"><HardHat size={10} /></div></div><div className="min-w-0 flex-1"><div className="truncate font-display text-sm font-bold text-foreground">{c.nome}</div><div className="text-xs text-muted-foreground">{c.funcao} · {c.matricula}</div></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[c.status]}`}>{c.status}</span></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs"><span className="text-muted-foreground">OS hoje: <span className="font-bold text-foreground">{c.osHoje}</span></span><span className="text-muted-foreground">Horas mês: <span className="font-bold text-foreground">{c.horasMes}h</span></span></div></GlassCard>;
}

function Mini({ label, value }: { label: string; value: number }) {
  return <GlassCard className="p-3 text-center"><div className="font-display text-2xl font-black text-foreground">{value}</div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div></GlassCard>;
}
