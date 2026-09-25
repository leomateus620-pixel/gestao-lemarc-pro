import {
  createFileRoute,
  Outlet,
  useLocation,
  useMatches,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { BottomNav } from "@/components/app/BottomNav";
import { PushPermissionGate } from "@/components/app/PushPermissionGate";
import { RoleProvider } from "@/components/app/RoleContext";
import { AuthProvider, useAuth } from "@/components/app/AuthContext";
import { safeInternalDestination } from "@/lib/modules";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <AuthGate>
        <RoleProvider>
          <Outlet />
          <BottomNavSlot />
          <PushPermissionGate />
          <AutoRefresh />
        </RoleProvider>
      </AuthGate>
    </AuthProvider>
  );
}

function BottomNavSlot() {
  const matches = useMatches();
  const hide = matches.some(
    (m) => (m.staticData as { hideBottomNav?: boolean } | undefined)?.hideBottomNav,
  );
  const fullscreenForm = useFullscreenFormFlag();
  if (hide || fullscreenForm) return null;
  return <BottomNav />;
}

const RESUME_RELOAD_MS = 30 * 60 * 1000;

// No app instalado, recarrega sozinho ao voltar após muito tempo em segundo
// plano, para sempre usar a versão publicada mais recente.
function useAutoRefreshOnResume() {
  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    let hiddenAt = 0;
    const onChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt || Date.now() - hiddenAt < RESUME_RELOAD_MS) return;
      const busy =
        document.documentElement.dataset.fullscreenForm === "true" ||
        !!document.querySelector('[role="dialog"], [role="alertdialog"]');
      if (!busy) window.location.reload();
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
}

function AutoRefresh() {
  useAutoRefreshOnResume();
  return null;
}

function useFullscreenFormFlag() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof document === "undefined") return () => {};
      const el = document.documentElement;
      el.addEventListener("lemarc:fullscreen-form-change", cb);
      return () => el.removeEventListener("lemarc:fullscreen-form-change", cb);
    },
    () =>
      typeof document !== "undefined" && document.documentElement.dataset.fullscreenForm === "true",
    () => false,
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectRef = useRef(safeInternalDestination(location.href, "os"));
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate({
        to: "/login",
        search: { module: "os", redirect: redirectRef.current },
        replace: true,
      });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="lemarc-app-bg grid min-h-dvh place-items-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
