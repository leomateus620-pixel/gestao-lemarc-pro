import { Bell, ChevronLeft } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useRole } from "./RoleContext";
import type { ReactNode } from "react";

export function AppShell({
  children,
  title,
  back,
  action,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const { name, role, setRole } = useRole();
  const router = useRouter();

  return (
    <div className="blueprint-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="sticky top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md">
          <div className="glass-strong flex items-center gap-3 rounded-2xl px-3 py-2.5">
            {back ? (
              <button
                onClick={() => router.history.back()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground"
                aria-label="Voltar"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <Link to="/dashboard"><Logo size="sm" /></Link>
            )}
            <div className="min-w-0 flex-1">
              {title && <div className="truncate font-display text-sm font-bold uppercase tracking-wider text-foreground">{title}</div>}
              {!title && <div className="truncate text-xs text-muted-foreground">Olá, <span className="text-foreground font-semibold">{name.split(" ")[0]}</span></div>}
            </div>
            {action}
            <button
              onClick={() => setRole(role === "gestor" ? "colaborador" : "gestor")}
              className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary"
              title="Alternar papel (demo)"
            >
              {role}
            </button>
            <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
      </div>
    </div>
  );
}
