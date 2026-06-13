import { ChevronLeft, UserRound } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useRole } from "./RoleContext";
import { RoleSwitcher } from "./RoleSwitcher";
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
  const { name, role } = useRole();
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
              <div className="truncate font-display text-sm font-black uppercase tracking-wider text-foreground">{title ?? "Gestão Lemarc"}</div>
              <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operação Industrial · {title ? role : `Olá, ${name.split(" ")[0]}`}</div>
            </div>
            {action}
            <RoleSwitcher />
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><UserRound size={18} /></div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-2">{children}</main>
      </div>
    </div>
  );
}
