## Escopo

Refinar o wizard de criação de OS (mobile + desktop) com 4 mudanças funcionais e visuais. Sem mexer em listagem, status, autenticação ou regras de negócio existentes.

---

## 1. Renomear "Previsão" → "Previsão de início"

Mudança apenas de label exibida ao usuário. A coluna do banco `scheduled_for` permanece intacta.

Arquivos:
- `src/components/ordens/ServiceOrderWizard.tsx`
  - `BasicInfoStep`: label do campo `datetime-local` → "Previsão de início".
  - `ReviewStep`: label da linha de revisão → "Previsão de início".
- `src/routes/_app.ordens.$id.tsx` (linha 153): texto "Previsto para …" → "Previsão de início: …" para manter consistência.

---

## 2. Novo tipo de serviço "Outro" + campo livre

### Banco (migration)

- `ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'outro';`
- `ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS service_type_other text;`
- Sem alteração em RLS/GRANTs (coluna nova herda permissões da tabela).

### Tipos e API

- `src/types/serviceOrder.ts`: adicionar `"outro"` em `ServiceType` e `serviceTypeLabel.outro = "Outro"`.
- `src/lib/api/serviceOrders.functions.ts`:
  - `CreateInput` ganha `service_type_other?: string | null`.
  - `createServiceOrder` insere `service_type_other`.
  - `ORDER_SELECT` inclui `service_type_other`.
- `src/types/serviceOrder.ts` `ServiceOrder` ganha `service_type_other: string | null`.

### Wizard (`ServiceOrderWizard.tsx`)

- `Draft` ganha `typeOther: string`.
- `ServiceTypeStep`: card "Outro" aparece no grid (ícone `Pencil` ou `Sparkles`). Quando `draft.type === "outro"`:
  - Renderiza input "Descreva o tipo de serviço" (obrigatório, mínimo 3 chars), logo abaixo do grid e antes do bloco Prioridade.
  - Validação da etapa: `validity[3] = draft.type !== "outro" || draft.typeOther.trim().length >= 3`.
- `typeIcon.outro = Pencil`.
- Envio: quando type === "outro", passa `service_type_other = draft.typeOther.trim()`; caso contrário envia `null`.

### Exibição na revisão e detalhe

- `ReviewStep`: se `draft.type === "outro"`, mostrar "Outro · {typeOther}".
- `_app.ordens.$id.tsx`: ao renderizar tipo do serviço, se `service_type === "outro"` exibir o texto de `service_type_other`.

---

## 3. Revisão final mais clara e operacional

Reescrever `ReviewStep` em `ServiceOrderWizard.tsx`:

- Substituir os 3 blocos genéricos por **4 seções** com títulos pedidos:
  1. **Dados iniciais** — Título (destaque grande, font-display), Descrição.
  2. **Local e previsão** — Local/setor, Previsão de início.
  3. **Cliente e técnico** — Cliente, Unidade, Técnico, Função.
  4. **Serviço e prioridade** — Tipo (com texto custom se "outro"), Prioridade (com chip colorido igual ao do step de serviço).
- Hierarquia visual:
  - Card "hero" no topo para o título do serviço (font-display 2xl, badge de prioridade ao lado).
  - Demais blocos em `grid sm:grid-cols-2`, mobile em coluna única.
  - Labels em `text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80`, valores em `text-sm font-semibold text-foreground` (alinhados à esquerda, não justificados como hoje).
  - Cada linha vira `flex flex-col gap-1` (key em cima, value embaixo) em vez de `justify-between` apagado.
  - Cards com `bg-white/[0.06]` + `border-white/15` + `shadow-[0_12px_36px_-24px_rgba(0,0,0,0.6)]` para sair do tom esbranquiçado.
  - Ícones pequenos (lucide) à esquerda de cada título de seção.

---

## 4. Botão "Continuar" mais próximo do conteúdo + safe-area

Diagnóstico: `FormFlowActions` é `fixed bottom-0` com fade externo de 24px + padding `py-3`. No `AppShell` há `pb-[calc(env(safe-area-inset-bottom)+7rem)]` reservado para o footer fixo, gerando o "vão" sentido no mobile, principalmente em etapas curtas.

Ajustes:

### `src/components/app/FormFlowActions.tsx`
- Reduzir altura do fade externo de `h-6` → `h-4`.
- `py-3` → `py-2.5 sm:py-3`.
- Gap entre botões `gap-3` → `gap-2 sm:gap-3`.

### `src/components/ordens/ServiceOrderWizard.tsx` e `ClientWizard.tsx`
- Diminuir altura dos botões no mobile: `h-14` → `h-12 sm:h-14` (Voltar e Continuar) — reduz a faixa fixa e aproxima visualmente.

### `src/components/app/AppShell.tsx`
- Quando `fullscreenForm`, trocar `pb-[calc(env(safe-area-inset-bottom)+7rem)]` para `pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-[calc(env(safe-area-inset-bottom)+6.5rem)]`. Mantém clearance suficiente sem sobrar espaço vazio.

### Etapa de Serviço especificamente
- Grid no mobile: manter `grid-cols-2` (área de toque adequada ~150px), `gap-2` → `gap-2.5` para respiro.
- Estado ativo do card de tipo: aumentar contraste — `bg-primary/20` + `ring-1 ring-primary/60` no lugar do `bg-primary/10` atual.
- Cards mais altos no mobile: `py-3` → `py-3.5`, label em `text-[11px]` para legibilidade.
- Prioridade: já tem bom contraste; apenas confirmar `min-h-12` para área de toque.

---

## 5. Validação

- `bun run build` + `tsgo`.
- Playwright mobile (390×844) em `/ordens/nova`:
  - preencher todos os campos, criar OS padrão.
  - criar OS com tipo "Outro" e descrição custom; confirmar que revisão e detalhe exibem o texto.
  - confirmar que botão "Continuar" não sobrepõe inputs em nenhuma etapa.
- Desktop 1280: confirmar grid de 2 colunas na revisão e que o footer fixo continua funcional.

---

## Fora de escopo

- Não mexer em edição/listagem de OS (só leitura do tipo custom no detalhe).
- Não refatorar steps de Cliente/Técnico.
- Não alterar BottomNav nem AppShell além do padding ajustado.
