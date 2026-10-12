import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearUserRoleCache } from "@/hooks/useUserRole";
import { logAuthIssue, withTimeout } from "@/lib/auth/withTimeout";
import {
  classifyAuthError,
  isSessionTooOld,
  setSignOutReason,
  startVisibilityAutoRefresh,
  type SignOutReason,
} from "@/lib/auth/sessionPolicy";

const SESSION_TIMEOUT_MS = 15_000;

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Não foi possível confirmar a sessão (rede/tempo). A sessão salva é mantida. */
  timedOut: boolean;
  retry: () => void;
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
  const [attempt, setAttempt] = useState(0);
  const userSignOutRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const forceLocalSignOut = async (reason: SignOutReason) => {
      userSignOutRef.current = true;
      setSignOutReason(reason);
      clearUserRoleCache();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (error) {
        logAuthIssue("forcedSignOut", { error });
      }
    };

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
        userSignOutRef.current = true;
        await supabase.auth.signOut({ scope: "local" });
      }
    };

    /** Aplica a regra dos 30 dias; retorna true se a sessão foi encerrada. */
    const enforceMaxAge = (s: Session | null) => {
      if (s && isSessionTooOld(s)) {
        void forceLocalSignOut("expired_30d");
        return true;
      }
      return false;
    };

    // Callback síncrono: não aguardar chamadas do cliente aqui (evita lock preso).
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") {
        clearUserRoleCache();
        // Saída não pedida pela pessoa = servidor recusou a renovação.
        if (!userSignOutRef.current) setSignOutReason("server_rejected");
        userSignOutRef.current = false;
      }
      if (event !== "SIGNED_OUT" && enforceMaxAge(s)) return;
      setSession(s);
      if (s) setTimedOut(false);
      if (event === "SIGNED_IN") setTimeout(() => void enforceGoogleAdmin(s), 0);
    });

    const startedAt = Date.now();
    setLoading(true);
    setTimedOut(false);
    withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, "getSession")
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          logAuthIssue("getSession", { error, durationMs: Date.now() - startedAt });
          if (classifyAuthError(error) === "definitive") {
            userSignOutRef.current = true;
            await forceLocalSignOut("server_rejected");
            setSession(null);
          } else {
            setTimedOut(true); // mantém a sessão salva
          }
          setLoading(false);
          return;
        }
        if (enforceMaxAge(data.session)) {
          userSignOutRef.current = true;
          setSession(null);
          setLoading(false);
          return;
        }
        setSession(data.session);
        setLoading(false);
        setTimeout(() => void enforceGoogleAdmin(data.session), 0);
      })
      .catch((error) => {
        // Tempo esgotado ou rede: NUNCA apaga a sessão salva.
        logAuthIssue("getSession", { error, durationMs: Date.now() - startedAt });
        if (cancelled) return;
        setTimedOut(true);
        setLoading(false);
      });

    // Renovação só com o app visível; ao voltar, confere a regra dos 30 dias.
    const stopVisibility = startVisibilityAutoRefresh(supabase.auth, () => {
      setTimeout(() => {
        withTimeout(supabase.auth.getSession(), SESSION_TIMEOUT_MS, "resumeSession")
          .then(({ data }) => {
            if (!cancelled) enforceMaxAge(data.session);
          })
          .catch((error) => logAuthIssue("resumeSession", { error }));
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      stopVisibility();
    };
  }, [attempt]);

  const user = session?.user ?? null;
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (user?.email ? user.email.split("@")[0] : "Usuário");
  const avatarUrl = (meta.avatar_url as string) || (meta.picture as string) || null;

  async function signOut() {
    // Sai apenas deste aparelho.
    userSignOutRef.current = true;
    await supabase.auth.signOut({ scope: "local" });
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        timedOut,
        retry: () => setAttempt((n) => n + 1),
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
