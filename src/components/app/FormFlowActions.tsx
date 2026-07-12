import type { ReactNode } from "react";

/**
 * Barra de ações fixa no mobile e conectada ao formulário no desktop.
 * Mantém os botões "Voltar" e ação primária disponíveis sem cobrir o
 * conteúdo, com fundo opaco e espaço seguro inferior.
 *
 * Use em conjunto com <AppShell fullscreenForm /> e a route prop
 * staticData.hideBottomNav para liberar a faixa inferior.
 */
export function FormFlowActions({ children }: { children: ReactNode }) {
  return (
    <div className="lemarc-form-flow-actions pointer-events-none fixed inset-x-0 bottom-0 z-40 pt-3 md:static md:z-auto">
      <div className="pointer-events-auto border-t border-white/10 bg-[oklch(0.13_0.034_252)] shadow-[0_-16px_36px_-28px_rgba(0,0,0,0.9)] lg:rounded-xl lg:border">
        <div className="mx-auto flex w-full max-w-5xl gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] pt-2.5 sm:gap-3 sm:px-5 sm:pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-3 md:pb-3 lg:px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
