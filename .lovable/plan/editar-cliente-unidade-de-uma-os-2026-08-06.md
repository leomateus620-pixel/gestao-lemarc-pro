# Editar cliente/unidade de uma OS

Hoje a OS mostra Cliente e Unidade apenas como leitura. Vou adicionar a edição da unidade (e do cliente, quando necessário) direto na tela da OS, refletindo em todo o fluxo.

## O que muda para o usuário

- Na seção de detalhes da OS, ao lado de "Unidade", aparece um botão "Editar cliente/unidade" (visível para admin/gestor, mesmo padrão do "Editar técnicos").
- O diálogo permite:
  - escolher a empresa (cliente) com busca;
  - escolher a unidade daquela empresa, com busca por nome, cidade/UF, endereço e CNPJ (mesmo filtro já usado no cadastro de nova OS);
  - opção "Sem unidade específica".
- Ao salvar: confirmação, toast de sucesso e a OS atualiza imediatamente — cabeçalho, detalhes, impressão/PDF e relatórios passam a usar a unidade correta.
- Se a unidade escolhida tiver dados de deslocamento diferentes, um aviso informa que o resumo financeiro pode precisar de revisão (nenhum valor já lançado é alterado silenciosamente).

## Regras

- Trocar o cliente limpa a unidade se ela não pertencer ao novo cliente (evita vínculo inconsistente).
- Edição bloqueada para OS canceladas; permitida nos demais estados (inclusive aprovadas), já que o objetivo é corrigir cadastro errado.
- Somente admin/gestor pode alterar; técnicos continuam sem acesso.

## Detalhes técnicos

- `src/lib/api/serviceOrders.functions.ts`: nova server fn `updateServiceOrderClientUnit` (POST, `requireSupabaseAuth`) validando `id`, `client_id`, `client_unit_id`; confere que a unidade pertence ao cliente, atualiza `service_orders` e retorna a OS normalizada com `ORDER_SELECT`.
- `src/routes/_app.ordens.$id.tsx`: novo componente `EditClientUnitDialog` (padrão do `EditTechniciansDialog`), acionado a partir do `DetailField` de Unidade; invalida `["service-orders"]`, `["service-order", id]`, `["report-orders"]` e as queries de relatório/financeiro da OS.
- Listas de clientes/unidades vindas das funções já existentes de clientes (`listClients` + unidades por cliente), sem novas tabelas nem migração.
