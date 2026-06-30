## Objetivo

Permitir que cada **unidade de cliente** tenha CNPJ próprio e dados de deslocamento, e propagar essa informação para a criação de OS, detalhe da OS, relatórios e PDF — sem quebrar rotas, dados existentes ou fluxos de auth/Cloud.

## 1. Migration (incremental e segura)

Adicionar colunas opcionais em `public.client_units`:

- `cnpj text` (nullable) + índice único parcial `WHERE cnpj IS NOT NULL`
- `distance_km_from_base numeric(8,2)` (nullable)
- `default_displacement_rate_cents integer` (nullable, `>= 0`)
- `default_displacement_type text` (nullable, CHECK em `('km','fixed','none')`)
- `billing_notes text` (nullable)

Sem backfill, sem alterar RLS/policies, sem DROP. `types.ts` é auto-gerado e será atualizado após aprovar a migration.

## 2. Tipos e API

- `src/types/client.ts` — estender `ClientUnit` e `ClientUnitInput` com os novos campos opcionais.
- `src/types/serviceOrder.ts` — `ClientUnitLite` ganha `cnpj`, `distance_km_from_base`, `default_displacement_rate_cents`, `default_displacement_type`.
- `src/lib/api/clients.functions.ts` — adicionar os campos em `UNIT_COLS`, `createClientUnit`, `updateClientUnit`, `createCompany` (payload de unidades). Validar CNPJ via `isValidCNPJ` quando informado; normalizar para dígitos; checar duplicidade por `cnpj` em `client_units` (excluindo o próprio id no update).
- `src/lib/api/serviceOrders.functions.ts` — incluir os novos campos no select de `client_unit:client_units!...`.
- `src/lib/api/reports.functions.ts` — idem para listagem de relatórios; expor `client_unit_cnpj` no row mapeado.

## 3. Cadastro / edição de clientes e unidades

- `src/components/clientes/ClientWizard.tsx` — no passo de unidades, novos campos: CNPJ (com máscara via `maskCNPJ` e validação ao salvar), distância (km), valor/km (R$), tipo de deslocamento (select: km / fixo / nenhum), observações de cobrança.
- Tela de edição de unidade (existente em `/clientes/$id/editar` ou diálogo dentro de `/clientes/$id`): mesmos campos. Erro inline quando CNPJ inválido ou duplicado.
- `ClientIslandRow.tsx` — quando a unidade tiver CNPJ, mostrar abaixo do nome do chip da unidade (truncado, fonte mono).

## 4. Criação da OS (`/ordens/nova`)

- Em `ServiceOrderWizard.tsx`, ao escolher a unidade, exibir card com: **nome da unidade · CNPJ · cidade/UF · distância base · valor/km padrão**.
- Persistir `client_unit_id` (já funciona) e pré-preencher `hour_rate`/deslocamento somente se a OS já tiver campos correspondentes — **não introduzir novos campos de cobrança na OS nesta entrega** (evita escopo extra). Apenas exibir.
- Resumo final (`UnitLabel`) inclui CNPJ quando disponível.

## 5. Detalhe da OS, relatórios e PDF

- `src/routes/_app.ordens.$id.tsx` — bloco do cliente: linha 1 = `client.name` + CNPJ da empresa; linha 2 = `Unidade: {unit.name} · CNPJ {unit.cnpj} · {city}/{state}`. Fallback para legado quando não houver unidade.
- `src/components/reports/print/ServiceOrderReportDocument.tsx` — mesma estrutura no cabeçalho do PDF; substituir o atual `order.client?.unit` genérico por bloco estruturado empresa + unidade + CNPJs.
- `src/components/reports/print/ManagerialReportDocument.tsx` e `src/lib/reports/export.ts` — incluir coluna/linha "Unidade (CNPJ)" quando exportar CSV/PDF gerencial.
- `src/components/reports/ReportOrdersTable.tsx` — coluna "Unidade" mostra `unit.name` com CNPJ no tooltip/segunda linha.

## 6. Regras / não-quebra

- Todos os campos novos são opcionais; OS antigas continuam exibindo o fallback atual (`—` / nome do cliente).
- Não alterar `auth`, `service_orders` schema, nem `clients.cnpj`.
- Manter rotas `/clientes`, `/clientes/novo`, `/clientes/$id`, `/clientes/$id/editar`, `/ordens/nova`, `/ordens/$id`, `/ordens/$id/imprimir`, `/relatorios` — apenas alterar conteúdo renderizado.

## 7. Validação após implementação

1. `bunx tsgo --noEmit` + `bun run build`.
2. Playwright (desktop 1280 + mobile 390):
   - criar empresa com 2 unidades, CNPJ distinto em cada;
   - editar uma unidade e alterar CNPJ/km/valor;
   - criar OS escolhendo unidade B e conferir `client_unit_id` via `psql`;
   - abrir `/ordens/$id` e `/ordens/$id/imprimir` — conferir empresa + unidade + CNPJ;
   - abrir `/relatorios` — conferir coluna Unidade.
3. ESLint nos arquivos pedidos.

## Detalhes técnicos

- CNPJ armazenado apenas em dígitos; máscara só na UI via `maskCNPJ`.
- Validação client + server (`isValidCNPJ`); duplicidade checada por unidade dentro da mesma empresa (não global), para suportar empresas que reutilizam raiz de CNPJ em filiais distintas — índice parcial único global em CNPJ da unidade é **descartado**; ao invés disso uso `UNIQUE (client_id, cnpj) WHERE cnpj IS NOT NULL`.
- Os novos campos numéricos usam `Number` em TS; centavos inteiros para taxa, decimal para km.
- Tipo `default_displacement_type` exportado como union `"km" | "fixed" | "none"`.

## Arquivos a alterar

- migration nova
- `src/types/client.ts`, `src/types/serviceOrder.ts`
- `src/lib/api/clients.functions.ts`, `serviceOrders.functions.ts`, `reports.functions.ts`
- `src/components/clientes/ClientWizard.tsx`, `ClientIslandRow.tsx`
- `src/routes/_app.clientes.$id.tsx`, `_app.clientes.$id.editar.tsx` (campos de unidade)
- `src/components/ordens/ServiceOrderWizard.tsx`
- `src/routes/_app.ordens.$id.tsx`
- `src/components/reports/print/ServiceOrderReportDocument.tsx`, `ManagerialReportDocument.tsx`
- `src/components/reports/ReportOrdersTable.tsx`
- `src/lib/reports/export.ts`
