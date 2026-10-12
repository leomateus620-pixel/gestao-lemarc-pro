import { useEffect, useState } from "react";
import { clearLocalAuthSession } from "@/lib/auth/withTimeout";

const SHOW_CLEAR_AFTER_MS = 10_000;

/** Só quando a pessoa toca no botão: apaga a sessão deste aparelho e recarrega. */
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
  onRetry,
}: {
  className: string;
  spinnerClassName: string;
  /** Rede/tempo esgotado: sessão salva continua no aparelho. */
  timedOut: boolean;
  onRetry: () => void;
}) {
  const slow = useSlowWait(!timedOut);
  return (
    <div className={className} role="status" aria-label="Validando sessão">
      <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
        {timedOut ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold">Sem conexão no momento.</p>
            <p className="text-sm opacity-70">
              Você continua conectado neste aparelho. Verifique a internet e tente de novo.
            </p>
          </div>
        ) : (
          <div className={spinnerClassName} />
        )}
        {(slow || timedOut) && (
          <div className="flex flex-col items-center gap-2">
            {!timedOut && <p className="text-sm opacity-70">Está demorando mais que o normal.</p>}
            {timedOut && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Tentar de novo
              </button>
            )}
            <button
              type="button"
              onClick={clearSessionAndReload}
              className="rounded-xl border border-current/30 px-4 py-2 text-sm font-semibold"
            >
              Limpar sessão e tentar de novo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
