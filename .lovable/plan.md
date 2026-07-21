# Zerar clientes e cadastrar CAMERA AGROINDUSTRIAL S.A (63 filiais)

## Confirmações
- Planilha traz 63 filiais ativas, todas da mesma empresa (raiz CNPJ `98.248.644`).
- Estrutura: **1 cliente** `CAMERA AGROINDUSTRIAL S.A` + **63 unidades** em `client_units`.
- Todas as 52 OS antigas já foram apagadas → nenhuma OS ficará órfã.
- Nada de schema, RLS, fluxos, técnicos, valores/hora, relatórios ou UI é tocado.

## Passo 1 — Parse da planilha (offline, no sandbox)
Ler `/mnt/user-uploads/Lista_Filiais_Ativas_-_08-07-2026.xlsx` com pandas, gerando 63 registros com:
- `name` = coluna "Demominação Interna" (ex.: `MATRIZ`, `Casa Pedro Paiva`, ...)
- `address` = coluna "Endereço" completa
- `cnpj` = coluna "CNPJ" (normalizada; a linha "Casa Independência" está com `/0014/12` — corrigir para `/0014-12`)
- `city` = extraída do fim do endereço (padrões `- <Cidade> - RS.`, `<Cidade>-RS`, `<Cidade> RS - CEP`)
- `state` = `RS` fixo (todas as filiais são no RS)
- `is_primary` = `true` só na linha `MATRIZ` (CNPJ raiz `/0001-06`)

Casos ambíguos de cidade (Casa Independência com CNPJ mal-formado, "falta I.E.") serão registrados assim mesmo — sem inventar dados; `cnpj` mantém formato oficial `XX.XXX.XXX/XXXX-XX`.

## Passo 2 — Migração de dados (uma única operação, aprovada)
Uma migração SQL executando, em transação:

1. `DELETE FROM public.client_units;`
2. `DELETE FROM public.clients;`
   (cascata só desreferencia `service_orders.client_id/client_unit_id` via `ON DELETE SET NULL`, mas não há OS — inofensivo.)
3. `INSERT INTO public.clients` — 1 linha:
   - `name = 'CAMERA AGROINDUSTRIAL S.A'`
   - `cnpj = '98.248.644/0001-06'`
   - `city = 'Santa Rosa'`, `state = 'RS'`
   - `address = 'Rua General Bandeira s/n - Santa Rosa - RS.'`
   - `active = true`
   - `created_by` = um `user_id` admin existente (`28326a48-...` já usado em clientes anteriores)
4. `INSERT INTO public.client_units` — 63 linhas, com `client_id` = id da empresa recém-criada, cada uma com `name`, `address`, `city`, `state='RS'`, `cnpj`, `is_primary` (true só na MATRIZ), `active=true`, `created_by` = mesmo admin.

Deleção + inserção são operações de dados; serão feitas via ferramenta de dados (não schema). O usuário aprova antes da execução.

## Passo 3 — Validação pós-execução
Consultas no banco para confirmar:
- 1 linha em `public.clients` (nome = `CAMERA AGROINDUSTRIAL S.A`).
- 63 linhas em `public.client_units` vinculadas a ela, exatamente 1 com `is_primary = true`.
- CNPJs de unidades únicos por cliente (respeita índice `client_units_client_cnpj_unique`).

Depois abrir `/clientes` no preview para conferir visualmente a listagem e a página de detalhes da CAMERA com as 63 unidades.

## Fora do escopo (não será tocado)
- Schema, RLS, GRANTs.
- `service_orders`, técnicos, valores/hora, relatórios, PDF, notificações.
- Componentes de UI (`ClientIslandRow`, `ClientWizard`, `ClientUnitsEditor`).
- Rotas.

## Notas técnicas
- `clients.created_by` e `client_units.created_by` são `NOT NULL` → usar o UUID admin acima.
- Índice único de CNPJ em `clients` é parcial (só quando não nulo) — 1 registro com `/0001-06` não conflita.
- Cidade extraída por regex; qualquer linha em que o parse não achar cidade fica com `city = NULL` e o endereço completo preservado em `address` (nada é perdido).
- Nenhum valor de `distance_km_from_base` é preenchido — segue como hoje (admin edita depois na tela de editar unidade).
