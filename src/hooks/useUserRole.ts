import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/app/AuthContext";

export type AppRole = "admin" | "operador" | "tecnico";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isAdmin = roles.includes("admin");
  const isOperador = roles.includes("operador");
  // Enquanto os papéis não carregam, não decide (evita flash de UI técnica para admin).
  const isTecnico = !loading && !isAdmin && !isOperador;
  return { roles, loading, isAdmin, isOperador, isTecnico };
}
}