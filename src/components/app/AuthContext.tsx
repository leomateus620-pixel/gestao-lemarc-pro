import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearUserRoleCache } from "@/hooks/useUserRole";
import { clearLocalAuthSession, logAuthIssue, withTimeout } from "@/lib/auth/withTimeout";

const SESSION_TIMEOUT_MS = 15_000;

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** A leitura da sessão não terminou a tempo (sessão local já foi limpa). */
  timedOut: boolean;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
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
        await supabase.auth.signOut({ scope: "local" });
      }
    };

    // Callback síncrono: não aguardar chamadas do cliente aqui (evita lock preso).
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") clearUserRoleCache();
      setSession(s);
      if (event === "SIGNED_IN") setTimeout(() => void enforceGoogleAdmin(s), 0);
    });

    const startedAt = Date.now();
    withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, "getSession")
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
        setTimeout(() => void enforceGoogleAdmin(data.session), 0);
      })
      .catch((error) => {
        logAuthIssue("getSession", { error, durationMs: Date.now() - startedAt });
        clearLocalAuthSession();
        if (cancelled) return;
        setSession(null);
        setTimedOut(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (user?.email ? user.email.split("@")[0] : "Usuário");
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;

  async function signOut() {
    // Sai apenas deste aparelho.
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        timedOut,
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
