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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:pb-0">
      {/* Faixa de fade para suavizar a leitura do conteúdo logo acima. */}
      <div
        aria-hidden
        className="pointer-events-none -mb-px h-5 bg-gradient-to-b from-transparent to-[oklch(0.13_0.034_252)] md:hidden"
      />
      <div className="pointer-events-auto border-t border-white/10 bg-[oklch(0.13_0.034_252)] shadow-[0_-18px_42px_-28px_rgba(0,0,0,0.9)] md:rounded-2xl md:border md:bg-[oklch(0.15_0.034_252)] md:shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
        <div className="mx-auto flex w-full max-w-3xl gap-2 px-4 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          {children}
        </div>
      </div>
    </div>
  );
}
