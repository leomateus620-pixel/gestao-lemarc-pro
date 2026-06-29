import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { IdCard, LogOut, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/components/app/AuthContext";
import { RoleSwitcher } from "@/components/app/RoleSwitcher";
import { useRole } from "@/components/app/RoleContext";

export const Route = createFileRoute("/_app/mais")({
  head: () => ({ meta: [{ title: "Mais — Gestão Lemarc" }] }),
  component: MaisPage,
});

function MaisPage() {
  const navigate = useNavigate();
  const { displayName, email, avatarUrl, signOut } = useAuth();
  const { role } = useRole();
  const firstName = displayName.split(" ")[0] || "Operação";

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <AppShell title="Mais">
      <main className="mx-auto max-w-4xl space-y-4">
        <section className="lemarc-wizard-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-14 shrink-0 rounded-2xl border border-white/20 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/14 font-display text-sm font-black uppercase text-primary">
                  {firstName.slice(0, 2)}
                </span>
              )}
              <div className="min-w-0">
                <p className="lemarc-technical-label">Conta atual</p>
                <h1 className="truncate font-display text-2xl font-black leading-tight text-white">
                  {displayName}
                </h1>
                <p className="truncate text-sm font-semibold text-slate-300">
                  {email ?? "E-mail não informado"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="lemarc-pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-rose-300/30 bg-rose-400/10 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100 hover:bg-rose-400/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70"
            >
              <LogOut size={15} />
              Encerrar sessão
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <InfoPanel icon={IdCard} label="Perfil" value={role === "gestor" ? "Gestor" : "Campo"} />
          <InfoPanel icon={ShieldCheck} label="Sessão" value="Autenticada" />
          <div className="lemarc-horizontal-row min-h-[5.25rem] items-center">
            <span className="grid size-10 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
              <SlidersHorizontal size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="lemarc-technical-label block">Visualização</span>
              <span className="mt-1 block text-sm font-black text-white">Modo operacional</span>
            </span>
            <RoleSwitcher />
          </div>
        </section>

        <section className="lemarc-wizard-card p-5 sm:p-6">
          <p className="lemarc-technical-label">Atalhos</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/colaboradores"
              className="lemarc-pressable inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/35 bg-primary/14 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-primary hover:bg-primary/20"
            >
              <UserRound size={14} />
              Colaboradores
            </Link>
            <Link
              to="/relatorios"
              className="lemarc-pressable inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.11] bg-white/[0.055] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-primary/35"
            >
              Relatórios
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function InfoPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
}) {
  return (
    <div className="lemarc-horizontal-row min-h-[5.25rem] items-center">
      <span className="grid size-10 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="lemarc-technical-label block">{label}</span>
        <span className="mt-1 block text-sm font-black text-white">{value}</span>
      </span>
    </div>
  );
}
