import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
          <BottomNav />
        </RoleProvider>
      </AuthGate>
    </AuthProvider>
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
