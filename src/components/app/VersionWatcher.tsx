import { useEffect } from "react";
import {
  VERSION_CHECK_INTERVAL_MS,
  currentBuildId,
  decideReload,
  fetchRemoteBuildId,
  isScreenBusy,
} from "@/lib/app/versionCheck";

/**
 * Recarrega o app quando há uma versão publicada nova: ao abrir, ao voltar o foco,
 * a cada 5 min e ao voltar do bfcache. No /login recarrega na hora; nas demais
 * telas espera não haver nada em edição. Nunca toca na sessão.
 */
export function VersionWatcher() {
  useEffect(() => {
    let checking = false;
    let reloaded = false;
    const check = async () => {
      if (checking || reloaded) return;
      checking = true;
      try {
        const remote = await fetchRemoteBuildId();
        const decision = decideReload({
          current: currentBuildId(),
          remote,
          onLogin: window.location.pathname.startsWith("/login"),
          busy: isScreenBusy(),
        });
        if (decision === "reload") {
          reloaded = true;
          window.location.reload();
        }
      } finally {
        checking = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };
    void check();
    const timer = window.setInterval(() => void check(), VERSION_CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
