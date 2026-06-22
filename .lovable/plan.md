# Redesign visual da Dashboard — Premium Editorial

Reformulação puramente visual da área superior da `/dashboard`: header da marca, hero "Operação · Hoje" e estado vazio. Toda a lógica funcional, rotas, hooks, filtros, métricas e cards subsequentes permanecem inalterados.

## Escopo do redesign

1. **Header da marca** (`AppShell` topo / faixa de identidade da dashboard)
   - Logo Lemarc em laranja com sombra contida (sem glow exagerado)
   - "Gestão Lemarc" + eyebrow em mono ciano "Operação · {período}"
   - Indicador "Sistema Ativo" com ponto pulsante esmeralda
   - Avatar refinado + botão "+" integrado, hover com microelevação

2. **Hero "Operação · Hoje"** (`OperationTodayCard`)
   - Superfície contínua `bg-[#0a0f1d]` com borda `white/10`, halo gradiente laranja→ciano muito sutil atrás
   - Padrão técnico radial-dot a 3% de opacidade no fundo
   - Saudação grande "Olá, {nome}." + linha-resumo com destaque laranja itálico nas OS pendentes
   - Segmented filter Hoje/Semana/Mês em pill `bg-white/5`
   - CTA "Nova OS" laranja sólido, tátil (translate-y no hover, scale no active), sombra contida
   - Mini-status (4) como módulos `bg-white/5 border-white/5 rounded-xl`, número grande tonal no hover (laranja/ciano/âmbar/esmeralda)

3. **Empty state** (`EmptyOperations`)
   - Composição centrada com ícone industrial em container `rounded-2xl` com halo ciano blur atrás
   - Título + subtítulo + CTA refinado
   - Container `border-dashed white/5 rounded-3xl`, respiro vertical generoso

4. **Cards de métricas abaixo** — não tocar comportamento; apenas alinhar cor de borda/fundo (`#0a0f1d` / `white/10`) se necessário para coerência. Sem mudança funcional.

## Física e motion

- Spring sutil em hover (translate-y -2px, ~200ms)
- Brilho direcional radial seguindo o cursor sobre o hero (CSS vars + handler leve)
- CTA com `active:scale-[0.97]`
- `prefers-reduced-motion`: desativa parallax e brilho direcional
- Mobile: efeitos reduzidos, grid 2x2 dos mini-status

## Tokens / cores

Usar os tokens semânticos existentes em `src/styles.css` (navy/orange/cyan já presentes). Sem hex hard-coded espalhado nos componentes — adicionar tokens auxiliares se faltar (`--hero-surface`, `--hero-border`).

## Arquivos afetados

- `src/components/dashboard/OperationTodayCard.tsx` — rewrite visual
- `src/components/dashboard/EmptyOperations.tsx` — rewrite visual
- `src/components/dashboard/MetricPeriodFilter.tsx` — refinar pill (sem mudar API)
- `src/components/app/AppShell.tsx` ou header equivalente da dashboard — refinar topbar (ajuste mínimo se afetar outras rotas; preferir refinar somente o cabeçalho dentro do `/dashboard`)
- `src/routes/_app.dashboard.tsx` — pequenos ajustes de spacing/composição
- `src/styles.css` — eventuais novos tokens semânticos para superfície do hero
- (opcional) `src/hooks/useCursorGlow.ts` — novo hook leve para brilho direcional

## Fora de escopo

- Rotas, navegação, filtros, dados, server functions, RLS
- Lógica/props dos cards de métricas (`MetricCard`)
- Mock data, hooks de query
- Componentes de OS (`ServiceOrderCard`)

## Validação

- Conferir build/typecheck automáticos
- Screenshot Playwright em desktop + mobile da `/dashboard` antes de finalizar
- Verificar que filtros Hoje/Semana/Mês continuam mudando métricas
- Verificar empty state com 0 OS e estado com OS reais
