# Fundo azul claro global (sem afetar cards)

## Objetivo
Substituir o fundo escuro navy do sistema por um azul claro suave em todas as telas do app (dashboard, ordens, clientes, colaboradores, relatórios, login, detalhes de OS/cliente), mantendo intactos os cards atuais, seus contrastes, seus textos brancos, badges, bordas e glows.

## Estratégia (mínima invasão)
O fundo visível do app vem essencialmente de **um único utilitário**: `lemarc-app-bg` em `src/styles.css` (aplicado em `AppShell`, login e telas de loading). Os cards usam `--card`, `glass-card`, `lemarc-liquid-card`, etc. — todos com cor própria, independentes de `--background`.

Logo:
1. Reescrever apenas `lemarc-app-bg` para um azul claro com leve gradiente (não branco puro, tom "blueprint claro").
2. Não tocar em `--background`, `--card`, `--foreground` nem nos utilitários de card. Cards continuam navy/glass com texto claro — contraste melhora, não piora.
3. Ajustar somente os **textos/ícones que ficam diretamente sobre o fundo** (fora de cards) para uma cor escura legível sobre azul claro: títulos de seção (`section-title`), header do `AppShell` (título + subtítulo "Central de operação · Nome"), links "Ver todas", o subtítulo cinza do bloco "Cards operacionais", e textos do `EmptyOperations`.
4. Ajustar o chip do header (`lemarc-liquid` no `AppShell` e na `BottomNav`) para uma variante mais opaca/escura, garantindo que o glass continue legível sobre fundo claro (hoje usa branco translúcido — sumiria).
5. Login: o card central já é escuro; só o fundo muda.

## Paleta proposta
- Fundo base: `oklch(0.94 0.025 245)` (azul muito claro, levemente acinzentado — não branco).
- Halos: gradientes radiais suaves em `oklch(0.86 0.04 240)` + `oklch(0.9 0.05 220)` para dar profundidade sem ruído.
- Texto sobre fundo (novo token `--on-app-bg`): `oklch(0.28 0.04 252)` (navy profundo) para títulos; `oklch(0.42 0.03 250)` para subtítulos.
- `lemarc-liquid` (chip do header + bottom nav): trocar branco translúcido por `linear-gradient` em navy translúcido (`oklch(0.22 0.045 252 / 0.85)` → `0.7`) com borda branca sutil — mantém o efeito liquid mas legível sobre claro.

## Arquivos a alterar
- `src/styles.css`
  - Reescrever `@utility lemarc-app-bg` (gradiente claro).
  - Reescrever `@utility lemarc-liquid` (variante navy translúcida).
  - Atualizar `@utility section-title` → `color: var(--on-app-bg)`.
  - Adicionar `--on-app-bg` e `--on-app-bg-muted` em `:root`.
- `src/components/app/AppShell.tsx`
  - Trocar classes `text-foreground` / `text-muted-foreground` do título e subtítulo do header pelas novas (`text-[color:var(--on-app-bg)]` / `...-muted`). Botão "voltar" e botão "sair" ganham fundo `bg-white/70` em vez de `bg-secondary` para contraste.
  - Avatar fallback mantém estilo (já tem fundo próprio).
- `src/routes/_app.dashboard.tsx`
  - Wrapper "Cards operacionais": trocar `bg-[#0b1424]/60` por uma superfície clara translúcida (`bg-white/55 border-white/60`) para integrar ao novo fundo; manter título escuro.
  - Header "Ordens recentes" → cor escura.
- `src/components/dashboard/EmptyOperations.tsx` e `src/components/app/EmptyState.tsx`
  - Trocar textos `text-muted-foreground` por variante escura.
- `src/routes/_app.ordens.index.tsx`, `_app.clientes.index.tsx`, `_app.colaboradores.tsx`, `_app.relatorios.tsx`
  - Verificar headers/subtítulos/labels que ficam fora de cards e aplicar a nova cor escura. Filtros e tabs (já usam superfície própria) permanecem.
- `src/components/app/BottomNav.tsx`
  - Sem mudança de markup; herda nova `lemarc-liquid`.
- `src/routes/_app.tsx` (loader)
  - Spinner: trocar borda `border-primary/30` por algo visível sobre claro (já é laranja, ok — só conferir).

## Plano de validação (Playwright autenticado, antes e depois)
Capturas em desktop 1280 e mobile 390 nas rotas:
- `/dashboard` (incluindo `OperationTodayCard`, grid de `MetricCard`, "Ordens recentes")
- `/ordens` (com `?status=andamento` e `?period=custom`)
- `/ordens/:id` (detalhe)
- `/clientes`, `/clientes/:id`
- `/colaboradores`, `/relatorios`
- `/login`
- Skeleton (`DashboardSkeleton`) com rede lenta simulada

Checks visuais:
- Nenhum texto "branco sobre branco" ou ilegível sobre o novo fundo.
- Cards mantêm fundo navy/glass e textos claros — contraste aumenta.
- Bottom nav legível, não sobrepõe conteúdo.
- Header sticky com chip liquid escuro continua visível ao rolar.
- Halos do fundo discretos, sem competir com cards.

## Fora de escopo
- Nenhum hook, query, rota, schema, ação ou dado. Apenas tokens CSS + classes Tailwind nos pontos listados.
- Cards (`ServiceOrderCard`, `ClientCard`, `MetricCard`, `OperationTodayCard`, etc.) não são alterados.

## Riscos e mitigação
- **Glass dos cards** ficar "leitoso" sobre claro: `lemarc-liquid-card` já mistura com `--card` (navy) em opacidade alta → permanece escuro. Validar no Playwright.
- **Inputs/popovers** (shadcn) usam `--input`/`--popover` tokens dark — continuam escuros; só conferir contraste de placeholder se cair sobre fundo.
- **Skeleton shimmer** pode precisar de tom mais escuro para aparecer; ajustar se Playwright mostrar invisível.

## Entregáveis
- Diff concentrado em `src/styles.css` + ~6 arquivos de markup.
- Conjunto de screenshots antes/depois para confirmar que nenhum card perdeu legibilidade.
- Relato de qualquer dívida visual preexistente fora do escopo.
