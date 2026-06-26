import type { ReactNode } from "react";

/**
 * Barra de ações fixa para fluxos de formulário (wizards, edições longas).
 * Mantém os botões "Voltar" e ação primária sempre visíveis sobre o
 * conteúdo, com fundo opaco para não cobrir campos durante o scroll.
 *
 * Use em conjunto com <AppShell fullscreenForm /> e a route prop
 * staticData.hideBottomNav para liberar a faixa inferior.
 */
export function FormFlowActions({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Faixa de fade para suavizar a leitura do conteúdo logo acima. */}
      <div
        aria-hidden
        className="pointer-events-none h-6 -mb-px bg-gradient-to-b from-transparent via-[oklch(0.945_0.03_70/0.78)] to-[oklch(0.13_0.034_252/0.96)]"
      />
      <div className="pointer-events-auto border-t border-white/10 bg-[oklch(0.13_0.034_252/0.96)] shadow-[0_-18px_42px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
