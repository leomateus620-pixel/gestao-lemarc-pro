## Objetivo

Corrigir a experiência mobile dos fluxos em etapas (Nova OS, Cliente) — botões fixos sem sobrepor conteúdo, BottomNav oculta no cadastro, scroll reset por etapa, sem overflow horizontal, e refinar contraste dos cards mantendo a identidade industrial Lemarc. Desktop, regras de negócio e arquitetura existentes permanecem intactos.

## Causa raiz

1. **Botão "Continuar" cobre campos**: em `ServiceOrderWizard.tsx` e `ClientWizard.tsx` a barra de ações usa `sticky bottom-24` dentro do `<main>` que rola junto com o conteúdo, e como a BottomNav (h≈80px) divide o mesmo espaço, o sticky se transforma em "flutuante por cima do conteúdo" sem fundo opaco.
2. **BottomNav presente no cadastro**: `src/routes/_app.tsx` renderiza `<BottomNav />` globalmente, sem opt-out por rota.
3. **Scroll não volta ao topo entre etapas**: troca de `step` só translada o carrossel horizontal; `window.scrollY` mantém-se.
4. **Cards apagados**: `lemarc-wizard-card` está com transparência alta sobre fundo cream — pouco contraste.
5. **Padding inferior em `<main>`**: `pb-32` é insuficiente quando o sticky+BottomNav coexistem; em flow sem BottomNav, é excessivo.

## Mudanças

### 1. Layout — opt-out de BottomNav por rota
- `src/routes/_app.tsx`: ler `useMatches()` e ocultar `<BottomNav />` quando alguma rota ativa tiver `staticData.hideBottomNav === true`.
- `src/components/app/AppShell.tsx`: aceitar nova prop `fullscreenForm?: boolean`. Quando `true`:
  - `<main>` recebe `pb-[calc(env(safe-area-inset-bottom)+8.5rem)]` (espaço só para a barra de ações, sem BottomNav).
  - Caso contrário mantém `pb-32` atual.
- Rotas que recebem `staticData: { hideBottomNav: true }` e passam `fullscreenForm` ao `AppShell`:
  - `src/routes/_app.ordens.nova.tsx`
  - `src/routes/_app.clientes.novo.tsx`
  - `src/routes/_app.clientes.$id.editar.tsx`

### 2. Barra de ações fixa reutilizável
- Criar `src/components/app/FormFlowActions.tsx`:
  - Container `fixed inset-x-0 bottom-0 z-40` com `pb-[env(safe-area-inset-bottom)]`, gradiente de fundo da cor da página (`lemarc-app-bg`) com blur no topo para "fade-in" do conteúdo (sem cobrir de forma opaca os campos durante o scroll, mas opaco na faixa do botão).
  - Conteúdo centralizado `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` e visual glass industrial coerente com a `lemarc-liquid` da topbar.
  - Slots: `back`, `primary` (label, icon, disabled, loading).
- Substituir a `<div className="sticky bottom-24 ...">` em:
  - `src/components/ordens/ServiceOrderWizard.tsx`
  - `src/components/clientes/ClientWizard.tsx`
- O conteúdo do wizard recebe `pb-4` interno (não mais `pb-32`), pois o `<main>` já reservou a altura via `fullscreenForm`.

### 3. Scroll reset por etapa
- Nos dois wizards, `useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step])`.
- Respeitar `prefers-reduced-motion` (instant scroll quando reduzido).

### 4. Anti overflow horizontal e ajustes mobile
- Em `styles.css`: garantir `html, body { overflow-x: hidden; }` (verificar antes de duplicar) e `.lemarc-page-enter` sem transforms persistentes.
- Wizards: trocar wrapper carrossel `overflow-hidden` por `overflow-x-clip` e remover qualquer `min-w` que force largura > viewport.
- Inputs/Textarea: confirmar `text-base` (>=16px) para evitar zoom no iOS Safari (revisar `src/components/ui/input.tsx` e `textarea.tsx` apenas se ainda usarem `text-sm` em mobile).

### 5. Refino visual dos cards (`lemarc-wizard-card`)
Em `src/styles.css`:
- Aumentar densidade do gradiente de fundo (azul-grafite mais opaco, ~0.92 alpha em vez de translúcido), borda `oklch(1 0 0 / 0.10)` + linha interna `inset 0 1px 0 oklch(1 0 0 / 0.08)`, sombra externa mais firme `0 20px 40px -28px oklch(0 0 0 / 0.6)`.
- Halo laranja superior reduzido (~0.14) para não roubar a leitura dos labels.
- `lemarc-wizard-input`: fundo `oklch(1 0 0 / 0.08)`, borda `oklch(1 0 0 / 0.22)`, placeholder `oklch(1 0 0 / 0.55)`, foco com ring laranja.
- Aplicar `lemarc-wizard-input` aos `<Input>`/`<Textarea>` dos dois wizards (substituir a `inputCls` local).
- Labels: subir contraste para `oklch(1 0 0 / 0.78)`.

### 6. Listagens (Ordens, Clientes, Dashboard)
- Sem mudanças estruturais. Confirmar que `pb-32` do `<main>` cobre a altura da BottomNav (3.5rem + safe-area). Se necessário, padronizar para `pb-[calc(env(safe-area-inset-bottom)+7rem)]`.

## Fora do escopo
- Refatorar wizards inteiros, alterar regras de validação, mexer em queries/Supabase, redesenhar BottomNav ou header.

## Validação
1. `npm run build` + `tsgo`.
2. Playwright mobile (390×844) em `/ordens/nova`:
   - Screenshot etapa 1 → Continuar → screenshot etapa 2 (verifica scroll no topo, botão não cobre).
   - Confirma ausência de BottomNav nas screenshots.
   - Repetir até etapa Revisão; confirmar "Criar Ordem de Serviço" fixo.
3. Repetir fluxo em `/clientes/novo`.
4. Desktop 1280×1800: confirmar `/dashboard`, `/ordens`, `/clientes` ainda com BottomNav e sem regressão visual.
5. Verificar overflow-x: `document.documentElement.scrollWidth === clientWidth`.