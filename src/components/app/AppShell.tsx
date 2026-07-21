import { Boxes, ChevronLeft, LogOut, Plus } from "lucide-react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useRole } from "./RoleContext";
import { useAuth } from "./AuthContext";
import { useEffect, type ReactNode } from "react";
import { useModuleAccessQuery } from "@/hooks/useModuleAccess";

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
  const moduleAccess = useModuleAccessQuery();
  const isHome = !title && !back;
  const firstName = (displayName || name).split(" ")[0];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  // Marca o documento enquanto uma tela de formulário fullscreen está montada.
  // O BottomNavSlot em src/routes/_app.tsx observa esse marcador para nunca
  // sobrepor a barra de ações do formulário, mesmo que a rota esqueça de
  // declarar staticData.hideBottomNav.
  useEffect(() => {
    if (!fullscreenForm || typeof document === "undefined") return;
    const el = document.documentElement;
    const prev = el.dataset.fullscreenForm;
    el.dataset.fullscreenForm = "true";
    el.dispatchEvent(new Event("lemarc:fullscreen-form-change"));
    return () => {
      if (prev) el.dataset.fullscreenForm = prev;
      else delete el.dataset.fullscreenForm;
      el.dispatchEvent(new Event("lemarc:fullscreen-form-change"));
    };
  }, [fullscreenForm]);

  return (
    <div className="lemarc-app-bg min-h-[100dvh] overflow-x-hidden">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col">
        <header className="lemarc-app-header fixed inset-x-0 top-0 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 lg:px-8">
          <div className={fullscreenForm ? "mx-auto w-full max-w-5xl" : "mx-auto w-full max-w-7xl"}>
            <div
              className={
                (fullscreenForm ? "lemarc-form-topbar" : "lemarc-solid-topbar") +
                " rounded-[1.15rem] px-2.5 py-2 sm:rounded-2xl sm:px-3 sm:py-2.5"
              }
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {back ? (
                  <button
                    onClick={() => router.history.back()}
                    className="lemarc-pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
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
                      className="h-9 w-auto max-w-[132px] object-contain sm:h-10 sm:max-w-[160px]"
                    />
                  </Link>
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={`${back ? "block" : "hidden md:block"} truncate font-display text-sm font-bold text-white drop-shadow-sm sm:text-[15px]`}
                  >
                    {isHome ? "Gestão Lemarc" : title}
                  </div>
                  <div className="hidden truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 lg:block">
                    {isHome ? "Central de operação" : role === "gestor" ? "Gestor" : "Campo"} ·{" "}
                    {firstName}
                  </div>
                </div>
                {action ??
                  (!back && (
                    <Link
                      to="/ordens/nova"
                      className="lemarc-pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground lemarc-orange-glow"
                      aria-label="Nova OS"
                    >
                      <Plus size={18} />
                    </Link>
                  ))}
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="size-8 shrink-0 rounded-full border border-white/25 object-cover shadow-[0_8px_18px_-12px_rgba(0,0,0,0.85)] sm:size-9"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/45 bg-primary/18 text-[10px] font-black uppercase text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:size-9 sm:text-[11px]">
                    {firstName.slice(0, 2)}
                  </span>
                )}
                {moduleAccess.data?.wireTrays ? (
                  <Link
                    to="/leitos"
                    className="lemarc-pressable grid size-11 shrink-0 place-items-center rounded-xl border border-orange-300/25 bg-orange-400/10 text-orange-200 transition hover:bg-orange-400/18 hover:text-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    aria-label="Abrir Leitos Aramados"
                    title="Leitos Aramados"
                  >
                    <Boxes size={17} />
                  </Link>
                ) : null}
                <button
                  onClick={handleSignOut}
                  className="lemarc-pressable grid size-11 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.07] text-slate-300 transition hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </header>
        <main
          className={
            "lemarc-page-enter lemarc-shell-main mx-auto w-full flex-1 px-4 sm:px-6 lg:px-8 " +
            (fullscreenForm ? "lemarc-shell-main--form" : "lemarc-shell-main--nav")
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
