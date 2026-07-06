import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/app/AuthContext";

export type AppRole = "admin" | "operador" | "tecnico";

const roleCache = new Map<string, AppRole[]>();

export function clearUserRoleCache() {
  roleCache.clear();
}

export function useUserRole() {
  const { user } = useAuth();
  const cached = user ? roleCache.get(user.id) : undefined;
  const [roles, setRoles] = useState<AppRole[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    const known = roleCache.get(user.id);
    if (known) {
      setRoles(known);
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
        const next = (data ?? []).map((r) => r.role as AppRole);
        roleCache.set(user.id, next);
        setRoles(next);
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