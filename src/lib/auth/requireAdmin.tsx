import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Client-side gate that blocks non-admin users from admin-only routes.
 * Redireciona técnicos ao dashboard operacional.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    );
  }
  return <>{children}</>;
}