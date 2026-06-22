## Revisão do PR #2 — Cards Operacionais da Home

Foco: validação funcional + polimento visual sobre o trabalho do Codex. Sem refazer, sem mexer em backend, auth, schema, hooks de dados ou rotas.

### 1. Validação funcional (antes de qualquer pixel)

Rodar Playwright autenticado (sessão Supabase já injetada no sandbox) em `/dashboard`, `/ordens`, `/ordens/nova`, `/clientes`, `/colaboradores` em viewport desktop (1280) e mobile (390). Capturar screenshots e console.

Checar:
- Cada `MetricCard` navega para a rota certa com os search params atuais (`status`, `filtro`, `period`, `from`, `to`).
- Em `/ordens` os params `period=custom&from=&to=` chegam, alimentam `MetricPeriodFilter` e filtram via `filterByPeriod` sem quebrar `status`/`filtro`/`q`.
- Trocar Hoje → Semana → Mês → Personalizado e voltar mantém URL coerente; "Limpar filtros" reseta para `period=all`.
- Caso patológico: `from > to` → `periodWindow` já inverte; confirmar contagens.
- Período vazio mostra 0 + badge "Sem registros" e CTA continua clicável.
- Bottom nav não sobrepõe o último card (padding bottom do `AppShell`).

Se quebrar: corrigir cirurgicamente (sem reescrever).

### 2. Polimento visual (sem alterar lógica)

Arquivos tocados apenas para CSS/markup leve:

**`src/components/dashboard/MetricCard.tsx`**
- Reduzir densidade: mini-resumo com fundo mais discreto (`bg-white/[0.03]` em vez de `[0.055]`), sem borda interna em cada linha — usar divisores `divide-y divide-white/[0.04]` para parecer menos "tabela".
- Ícone de fundo: cair de `size-28 opacity-[0.055]` para `size-24 opacity-[0.04]`, recuar mais para o canto.
- Badge: reduzir para `text-[9px]` em `px-1.5 py-0.5`, remover `min-w-0 max-w-[9rem]` (deixa fluido).
- Borda externa mais sutil: `border-white/[0.08]`; remover o degradê pesado do topo (manter só o trilho lateral).
- Trilho lateral: 3px em vez de 5px; reduzir glow.
- Altura mínima consistente: `min-h-[244px]` em todos para alinhar a grid.
- CTA do rodapé: tipografia `text-[10px]` mantida mas com `text-muted-foreground` + seta colorida — não disputa com o número.

**`src/components/dashboard/MetricPeriodFilter.tsx`**
- Integrar ao bloco "Cards operacionais": remover borda/shadow externos quando dentro do card-pai (já está dentro de wrapper no dashboard). Manter visual standalone em `/ordens`.
- Botão ativo: laranja mais sóbrio (sem `shadow-[var(--shadow-glow-orange)]` forte; usar sombra interna sutil).
- Mobile: garantir `lemarc-smart-scroll` com fade laterais; inputs de data em `grid-cols-2` no mobile (não empilhar 4 linhas).

**`src/components/dashboard/OperationTodayCard.tsx`**
- Reduzir padding mobile (`p-5` em vez de `p-6 sm:p-8` no breakpoint pequeno).
- Halos laranja/cyan: baixar opacidade (`/[0.06]` e `/[0.04]`).
- Mini Stats: aumentar contraste do label (`text-muted-foreground` → `text-muted-foreground/90`).

**`src/components/dashboard/DashboardSkeleton.tsx`**
- Ajustar altura para casar com novo `min-h-[244px]`.

**`src/hooks/usePhysicsCard.ts`** (apenas se necessário): confirmar que `mobileMaxRotate` já reduz parallax e que respeita `prefers-reduced-motion`. Se não respeitar, adicionar guard.

**`src/routes/_app.dashboard.tsx`**
- Wrapper "Cards operacionais": espaçamento `mt-6`, padding `p-4`, separar título e filtro com mais respiro no desktop.

### 3. Fora de escopo (não tocar)

- `useOperationalDashboard`, `metrics.ts`, `period.ts` — lógica já correta, mantida intacta.
- `serviceOrders.functions.ts`, queries, supabase client, auth.
- `ServiceOrderCard`, `ClientCard` (revisões anteriores já aplicadas).
- `routeTree.gen.ts` — regenerado automaticamente pelo plugin; não editar manualmente.

### 4. Verificação final

- `tsc` limpo (build automático do harness).
- Playwright revisita Home desktop + mobile e `/ordens` com `?period=custom&from=...&to=...`, screenshot final.
- Reportar qualquer dívida preexistente (Prettier/CRLF, Fast Refresh) sem corrigir.

### Detalhes técnicos

- Nenhum hook novo, nenhum tipo novo.
- Mudanças concentradas em ~5 arquivos, todas em classes Tailwind / markup.
- Sem novas dependências.
