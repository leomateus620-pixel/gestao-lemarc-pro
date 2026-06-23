## Objetivo

As telas "Cadastrar" (Dashboard / Início, Nova OS e Novo Cliente) ficaram esbranquiçadas demais depois que o fundo do app virou creme. Vou repintar essas áreas com uma identidade visual mais viva — navy profundo, brilho laranja na borda e leve halo azul — para que os cards de cadastro voltem a se destacar com força do fundo, sem perder contraste do texto nem responsividade.

## Escopo (somente CSS/markup de apresentação)

Vou mexer só nas áreas de cadastro:
1. Wizard de **Nova OS** — `src/components/ordens/ServiceOrderWizard.tsx`
2. Wizard de **Novo Cliente** — `src/components/clientes/ClientWizard.tsx`
3. Card "Cadastrar primeira OS" do Dashboard — `src/components/dashboard/EmptyOperations.tsx`

Sem tocar em backend, dados, rotas, fluxo, validações ou tokens globais usados em outras telas.

## Mudanças visuais

### 1) Novo utilitário `lemarc-wizard-card` em `src/styles.css`
Versão mais viva do `glass-card`, exclusiva dos wizards de cadastro:
- Gradiente navy mais profundo (`oklch(0.30 0.05 252)` → `oklch(0.14 0.04 252)`) em vez do glass translúcido atual, para resolver o aspecto esbranquiçado sobre o fundo creme.
- Halo laranja sutil no canto superior direito (`radial-gradient` com `oklch(0.72 0.19 50 / 0.18)`) — eco da identidade Lemarc.
- Halo azul-frio no canto inferior esquerdo (`oklch(0.55 0.12 235 / 0.14)`) para dar profundidade.
- Borda 1px com brilho interno (`inset 0 1px 0 oklch(1 0 0 / 0.16)`) e sombra externa mais densa para "levantar" o card do fundo claro.
- Linha fina laranja no topo (`::before` com `linear-gradient` horizontal) para marcar o card como "área de criação".

### 2) Variante `lemarc-wizard-stepper`
Stepper (a barra com 1–2–3–4) ganha:
- Fundo navy escuro com brilho laranja no item ativo.
- Pílulas concluídas com verde esmeralda mais vibrante.
- Texto da etapa atual em laranja brilhante (mantendo contraste AA).

### 3) Inputs dentro do wizard
Trocar `bg-white/[0.04]` por `bg-white/[0.06]` + `border-white/15` + `focus-visible:ring-primary/60`, aplicado via constante local nos dois wizards (sem mexer no componente `<Input>` global). Placeholder em `text-white/45` para legibilidade sobre o card navy.

### 4) `EmptyOperations` (card "Cadastrar primeira OS")
- Trocar o fundo `bg-white/55` (causa principal do "esbranquiçado") por `lemarc-wizard-card`.
- Texto migra de `var(--on-app-bg)` para `text-foreground` / `text-muted-foreground` (já existem no tema dark).
- Ícone e botão laranja mantidos, só recalibrando contraste sobre o navy.

## Validação

Após a implementação, vou rodar Playwright headless em 390×844 (mobile, viewport atual do usuário) e 1280×1800 (desktop) capturando:
- `/dashboard` (com estado vazio, para validar o EmptyOperations)
- `/ordens/nova` (etapa 1 e 2 do wizard)
- `/clientes/novo` (etapa 1 e 3 — onde aparecem cards aninhados de unidades)

Critérios de aceite por screenshot:
- Cards de cadastro visivelmente "destacados" do fundo creme/laranja (sem aspecto esbranquiçado).
- Texto branco principal com contraste ≥ 7:1 sobre o navy do card.
- Stepper, botão laranja "Continuar" e badges de prioridade preservados.
- Layout mobile sem overflow horizontal, sticky footer de navegação ainda visível.

## Fora de escopo

- Cor de fundo do app (`lemarc-app-bg`) — permanece como está.
- Header, BottomNav, cards de OS, cards de cliente fora dos wizards.
- Tokens globais (`--card`, `--primary`, etc.) — intactos.
- Lógica de validação, mutations e navegação dos wizards.
