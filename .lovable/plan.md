## Objetivo

Adicionar, na tela da Ordem de Serviço, um campo onde o técnico descreve **o que foi realizado**, posicionado **logo antes do bloco de assinatura do responsável**. O texto é salvo no banco, fica visível na OS depois de salvo e aparece no PDF.

## Como vai funcionar

- Novo cartão "Serviço executado — relato do técnico", exibido entre o Controle de tempo e o bloco de Assinatura.
- Estado vazio: aviso claro de responsabilidade ("Descreva o que foi executado antes de coletar a assinatura") com botão para escrever.
- Edição: área de texto ampla, contador de caracteres, botões Salvar / Cancelar, salvamento com confirmação (toast) e indicação de quem preencheu e quando.
- Depois de salvo: texto exibido formatado (quebras de linha preservadas), com botão "Editar" para o técnico atribuído e para o admin.
- Somente leitura quando a OS estiver aprovada/cancelada (admin continua podendo ajustar).
- Bloco de assinatura mostra um aviso leve quando o relato ainda estiver vazio, sem bloquear o fluxo atual.

## Persistência e exibição

- Nova coluna em `service_orders`: `execution_report` (texto), mais `execution_report_updated_by` e `execution_report_updated_at` para rastreabilidade. Migração aditiva, sem afetar dados existentes.
- Regras de acesso: só quem está atribuído à OS (ou admin) pode gravar; validação feita no servidor.
- O relato passa a ser a fonte do campo "Serviço executado" do PDF, que hoje é montado a partir das descrições dos apontamentos — no PDF ele aparece como "Serviço executado (relato do técnico)", mantendo os apontamentos por técnico como estão.
- Aparece também na visualização de impressão e no download do PDF da OS.

## Detalhes técnicos

- Migração: `ALTER TABLE public.service_orders ADD COLUMN execution_report text, ...` (sem novas tabelas, políticas RLS existentes já cobrem update da OS; a validação de atribuição fica na server function).
- Nova server function `updateServiceOrderExecutionReport` em `src/lib/api/serviceOrders.functions.ts` com `requireSupabaseAuth`, checando admin ou vínculo em `service_order_technicians`.
- `ORDER_SELECT` e `src/types/serviceOrder.ts` passam a incluir os novos campos.
- Novo componente `src/components/ordens/ExecutionReportSection.tsx`, montado em `src/routes/_app.ordens.$id.tsx` antes de `<SignatureBlock />`.
- Hook de mutação em `src/hooks/useServiceOrders.ts` com invalidação da query da OS.
- PDF: `src/components/reports/print/ServiceOrderReportDocument.tsx` e `src/lib/reports/serviceOrderDownload.ts` usam `execution_report` quando existir.
