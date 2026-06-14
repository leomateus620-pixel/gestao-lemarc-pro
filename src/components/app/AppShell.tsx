import { ChevronLeft, Plus } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useRole } from "./RoleContext";
import type { ReactNode } from "react";

export function AppShell({ children, title, back, action }: { children: ReactNode; title?: string; back?: boolean; action?: ReactNode }) {
  const { name, role } = useRole();
  const router = useRouter();
  const isHome = !title && !back;
  return <div className="blueprint-bg lemarc-command-grid min-h-dvh"><div className="mx-auto flex min-h-dvh max-w-md flex-col">
    <header className="sticky top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md">
      <div className="lemarc-liquid rounded-2xl px-3 py-2.5"><div className="flex min-w-0 items-center gap-3">
        {back ? <button onClick={() => router.history.back()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground lemarc-pressable" aria-label="Voltar"><ChevronLeft size={21}/></button> : <Link to="/dashboard" className="shrink-0"><Logo size="sm" /></Link>}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-black uppercase tracking-wide text-foreground">{isHome ? "Gestão Lemarc" : title}</div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{isHome ? "Central de operação" : role === "gestor" ? "Gestor" : "Campo"} · {name.split(" ")[0]}</div>
        </div>
        {action ?? (!back && <Link to="/ordens/nova" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground lemarc-orange-glow" aria-label="Nova OS"><Plus size={18}/></Link>)}
        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-primary">{role === "gestor" ? "Gestor" : "Téc."}</span>
      </div></div>
    </header>
    <main className="lemarc-page-enter flex-1 px-4 pb-32 pt-2">{children}</main>
  </div></div>;
}
