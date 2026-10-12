import { useEffect, useState } from "react";
import { clearLocalAuthSession } from "@/lib/auth/withTimeout";

const SHOW_CLEAR_AFTER_MS = 10_000;

export function clearSessionAndReload() {
  clearLocalAuthSession();
  window.location.reload();
}

/** Mostra o botão de limpar sessão quando a espera passa de 10 s. */
export function useSlowWait(active: boolean, ms = SHOW_CLEAR_AFTER_MS) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
  return slow;
}

export function SessionWaitScreen({
  className,
  spinnerClassName,
  timedOut,
  loginHref,
}: {
  className: string;
  spinnerClassName: string;
  timedOut: boolean;
  loginHref: string;
}) {
  const slow = useSlowWait(!timedOut);
  return (
    <div className={className} role="status" aria-label="Validando sessão">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        {timedOut ? (
          <p className="text-sm font-semibold">Não foi possível carregar sua sessão.</p>
        ) : (
          <div className={spinnerClassName} />
        )}
        {(slow || timedOut) && (
          <div className="flex flex-col items-center gap-2">
            {!timedOut && (
              <p className="text-sm opacity-70">Está demorando mais que o normal.</p>
            )}
            <button
              type="button"
              onClick={clearSessionAndReload}
              className="rounded-xl border border-current/30 px-4 py-2 text-sm font-semibold"
            >
              Limpar sessão e tentar de novo
            </button>
            {timedOut && (
              <a href={loginHref} className="text-sm underline">
                Voltar ao login
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
