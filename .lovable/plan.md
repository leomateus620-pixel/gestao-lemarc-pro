# Adicionar "Solicitante" na Etapa 3 da Nova OS

## O que muda
Hoje a Etapa 3 ("Técnico") só pede o executor. Vou adicionar um campo **Solicitante** (nome em texto livre), **obrigatório** para avançar, persistido junto à OS e exibido na Revisão, no detalhe da OS, nos relatórios/impressão.

## Backend
- **Migração**: adicionar coluna `requester_name text` em `public.service_orders` (nullable no banco para não quebrar registros antigos; obrigatoriedade fica no formulário/validação).
- Sem novas policies/tabelas; coluna simples.

## Server function
- `src/lib/api/serviceOrders.functions.ts`
  - Incluir `requester_name` no `ORDER_SELECT`.
  - Aceitar `requester_name` em `CreateInput` e no `insert`.
  - Adicionar `updateServiceOrderRequester` (ou estender o update já existente) para permitir edição posterior. (Apenas se houver patch genérico; senão fica só na criação por enquanto.)
- `src/types/serviceOrder.ts`: adicionar `requester_name: string | null`.

## Wizard (Etapa 3)
- `src/components/ordens/ServiceOrderWizard.tsx`:
  - Estender o `draft` com `requesterName: string`.
  - Em `TechnicianStep`, adicionar bloco no topo "Solicitante da OS" com `<Input>` (nome, max 120, trim), helper text "Quem solicitou esta OS".
  - Atualizar `validity[2]` para exigir `requesterName.trim().length >= 2` (além das regras atuais de técnico, se houver).
  - Atualizar `StepHeader` para refletir os dois subtemas ou manter eyebrow "Etapa 3 · Técnico & Solicitante".
  - Passar `requester_name` no payload do `createServiceOrder`.

## Revisão e leitura
- `ReviewStep`: mostrar "Solicitante: <nome>".
- `src/routes/_app.ordens.$id.tsx` (detalhe): exibir o solicitante na ficha.
- `src/components/reports/print/ServiceOrderReportDocument.tsx` e `ManagerialReportDocument`: incluir solicitante na ficha quando disponível.
- `ReportOrderRow`/relatórios: incluir `requester_name` se já houver projeção da OS.

## Validação
- `tsgo` para tipos.
- Conferir manualmente no preview que a Etapa 3 só avança com solicitante preenchido e que o nome aparece na Revisão e no detalhe da OS após criar.

## Não inclui
- Cadastro reutilizável de solicitantes (tabela própria, contatos por unidade) — pode ser proposto depois.
- Edição em massa de OSs antigas (ficam com solicitante vazio).
