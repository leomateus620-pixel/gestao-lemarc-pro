import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";
import { BottomNav } from "@/components/app/BottomNav";
import { RoleProvider } from "@/components/app/RoleContext";
import { AuthProvider, useAuth } from "@/components/app/AuthContext";

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

function useFullscreenFormFlag() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof document === "undefined") return () => {};
      const el = document.documentElement;
      el.addEventListener("lemarc:fullscreen-form-change", cb);
      return () => el.removeEventListener("lemarc:fullscreen-form-change", cb);
    },
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.fullscreenForm === "true",
    () => false,
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
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
