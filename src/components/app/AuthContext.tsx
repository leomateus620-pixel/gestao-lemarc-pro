import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearUserRoleCache } from "@/hooks/useUserRole";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enforceGoogleAdmin = async (s: Session | null) => {
      if (!s?.user) return;
      const provider = s.user.app_metadata?.provider;
      const providers = (s.user.app_metadata?.providers ?? []) as string[];
      const isGoogle = provider === "google" || providers.includes("google");
      if (!isGoogle) return;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error || !data) {
        clearUserRoleCache();
        await supabase.auth.signOut();
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") clearUserRoleCache();
      setSession(s);
      if (event === "SIGNED_IN") void enforceGoogleAdmin(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      void enforceGoogleAdmin(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (user?.email ? user.email.split("@")[0] : "Usuário");
  const avatarUrl =
    (meta.avatar_url as string) || (meta.picture as string) || null;

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        displayName,
        avatarUrl,
        email: user?.email ?? null,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}