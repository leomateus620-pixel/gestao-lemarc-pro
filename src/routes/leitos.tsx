import { useEffect, useRef, type ReactNode } from "react";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/components/app/AuthContext";
import { LeitosShell } from "@/components/leitos/LeitosShell";
import { WireTrayAccessProvider } from "@/components/leitos/WireTrayAccessContext";
import { safeInternalDestination } from "@/lib/modules";

export const Route = createFileRoute("/leitos")({
  ssr: false,
  component: WireTrayLayout,
});

function WireTrayLayout() {
  return (
    <AuthProvider>
      <WireTrayAuthGate>
        <WireTrayAccessProvider>
          <LeitosShell>
            <Outlet />
          </LeitosShell>
        </WireTrayAccessProvider>
      </WireTrayAuthGate>
    </AuthProvider>
  );
}

function WireTrayAuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectRef = useRef(safeInternalDestination(location.href, "wire_trays"));
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate({
        to: "/login",
        search: { module: "wire_trays", redirect: redirectRef.current },
        replace: true,
      });
    }
  }, [loading, navigate, user]);

  if (loading || !user) {
    return (
      <div
        className="wire-root grid min-h-dvh place-items-center"
        role="status"
        aria-label="Validando sessão"
      >
        <div className="size-10 animate-spin rounded-full border-2 border-orange-200 border-t-orange-700" />
      </div>
    );
  }
  return <>{children}</>;
}
