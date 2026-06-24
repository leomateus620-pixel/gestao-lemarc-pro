import { ChevronLeft, LogOut, Plus } from "lucide-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useRole } from "./RoleContext";
import { useAuth } from "./AuthContext";
import type { ReactNode } from "react";

const HEADER_LOGO_SRC = "/branding/lemarc-login-logo.png";

export function AppShell({
  children,
  title,
  back,
  action,
  fullscreenForm,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  action?: ReactNode;
  /**
   * Quando true, reserva o espaço inferior só para a barra de ações do
   * formulário (sem BottomNav) e remove o padding extra do menu.
   */
  fullscreenForm?: boolean;
}) {
  const { name, role } = useRole();
  const router = useRouter();
  const navigate = useNavigate();
  const { displayName, avatarUrl, signOut } = useAuth();
  const isHome = !title && !back;
  const firstName = (displayName || name).split(" ")[0];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }
  return (
    <div className="lemarc-app-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-md sm:px-6 lg:px-8">
          <div className="lemarc-liquid rounded-2xl px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              {back ? (
                <button
                  onClick={() => router.history.back()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground lemarc-pressable"
                  aria-label="Voltar"
                >
                  <ChevronLeft size={21} />
                </button>
              ) : (
                <Link to="/dashboard" className="shrink-0" aria-label="Ir para o dashboard">
                  <img
                    src={HEADER_LOGO_SRC}
                    alt="Gestão Lemarc"
                    decoding="async"
                    draggable={false}
                    className="h-9 w-auto max-w-[160px] object-contain"
                  />
                </Link>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-black uppercase tracking-wide text-foreground">
                  {isHome ? "Gestão Lemarc" : title}
                </div>
                <div className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {isHome ? "Central de operação" : role === "gestor" ? "Gestor" : "Campo"} ·{" "}
                  {firstName}
                </div>
              </div>
              {action ??
                (!back && (
                  <Link
                    to="/ordens/nova"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground lemarc-orange-glow"
                    aria-label="Nova OS"
                  >
                    <Plus size={18} />
                  </Link>
                ))}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-9 shrink-0 rounded-full border border-white/15 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/15 text-[11px] font-black uppercase text-primary">
                  {firstName.slice(0, 2)}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground transition hover:text-foreground lemarc-pressable"
                aria-label="Sair"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>
        <main
          className={
            "lemarc-page-enter flex-1 px-4 pt-2 sm:px-6 lg:px-8 " +
            (fullscreenForm
              ? "pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-[calc(env(safe-area-inset-bottom)+6.5rem)]"
              : "pb-32")
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
