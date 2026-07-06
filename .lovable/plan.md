## Objetivo

Permitir editar as configurações de precificação do colaborador — em especial o **Valor/Hora** — a partir de uma rota dedicada e enxuta, acessível diretamente do card "Precificação" no perfil.

Hoje já existe `/colaboradores/$id/editar` (wizard completo com `focus=rate`), mas o usuário quer um caminho direto, rápido e específico para editar o valor da hora sem passar pelo wizard multi-etapas.

## O que será feito

### 1. Nova rota dedicada
Arquivo: `src/routes/_app.colaboradores.$id.precificacao.tsx`
- URL: `/colaboradores/$id/precificacao`
- Título: "Editar precificação — Gestão Lemarc"
- `AppShell` com `back`, envolto em `Suspense`

### 2. Formulário compacto (na própria rota)
Campos, todos em pt-BR:
- **Valor normal (R$/h)** — obrigatório, input monetário (mesmo `parseCurrencyInput` já usado no wizard)
- **Hora extra 50% (R$/h)** — opcional; placeholder sugerido = valor normal × 1,5
- **Hora extra 100% (R$/h)** — opcional; placeholder sugerido = valor normal × 2
- **Observação de precificação** — textarea curto

Comportamento:
- Pré-carrega valores atuais via `useTechniciansQuery`
- Botão primário "Salvar precificação" (`updateTechnician`)
- Botão secundário "Cancelar" → volta ao perfil
- Toast de sucesso/erro, invalida `["technicians"]`, `["service-orders"]`, `["technician-labor-history"]`, `["order-financials"]`, `["report-orders"]`
- Redireciona para `/colaboradores/$id` após salvar
- Se colaborador não existe → `notFound()`
- Reutiliza helpers `centsToInput` / `parseCurrencyInput` extraindo-os para `src/components/colaboradores/format.ts` (ou inline se já disponíveis) — sem duplicar lógica do wizard

### 3. Integração no perfil
Em `src/routes/_app.colaboradores.$id.tsx`:
- Adicionar botão "Editar" (ícone `PenLine`) no header do painel **Precificação** apontando para a nova rota
- O CTA amarelo "Definir agora" (quando `hourlyRateCents == null`) passa a apontar para `/colaboradores/$id/precificacao` (mais direto que abrir o wizard inteiro)
- Manter o botão "Editar" geral do topo apontando para `/editar` (wizard completo) — sem regressão

### 4. Rota do wizard (sem alteração funcional)
`/colaboradores/$id/editar?focus=rate` continua funcionando; a nova rota é um atalho focado, não substituição.

## Detalhes técnicos

- Sem migração: usa `updateTechnician` já existente em `src/lib/api/serviceOrders.functions.ts`
- Sem novos endpoints, sem mudanças de RLS
- `routeTree.gen.ts` é regenerado pelo plugin — não editar manualmente
- Nada muda em OS, relatórios ou PDF

## Entregáveis

- [ ] `src/routes/_app.colaboradores.$id.precificacao.tsx` (novo)
- [ ] Botão "Editar" no card Precificação em `_app.colaboradores.$id.tsx`
- [ ] CTA "Definir valor/hora" redirecionado para a nova rota
- [ ] Validação: salvar valor/hora reflete no perfil e nas OS futuras
