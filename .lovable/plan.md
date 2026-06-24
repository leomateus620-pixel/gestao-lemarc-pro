## Objetivo

Adicionar ao menu **Relatórios** uma funcionalidade real de geração de **Relatório Gerencial em PDF**, usando exclusivamente dados reais (OS, clientes, unidades, técnicos), com filtros, prévia e download. Sem mocks, com RLS preservada.

## Abordagem técnica

- **Geração do PDF**: HTML print-safe + `window.print()` (sem dependências novas). Será montada uma rota dedicada `/relatorios/imprimir` em layout próprio (sem sidebar/BottomNav), aplicando `@media print` para A4. O usuário usa "Salvar como PDF" do navegador. Nome sugerido aparece via `document.title`.
  - Motivo: já temos infra de filtros + métricas; jsPDF/html2canvas adicionariam peso e renderização fraca de tabelas longas. Print-to-PDF entrega layout profissional e fiel, com paginação automática.
- **Dados**: reaproveitar `getReportOrders` (já com `requireSupabaseAuth` + RLS). Adicionar campo `description` ao `ROW_SELECT` e ao tipo `ReportOrderRow` para a seção de observações.
- **Métricas**: estender `src/lib/reports/metrics.ts` com agregações específicas do relatório gerencial (por status, por cliente, por técnico, por tipo de serviço, taxa de conclusão, tempo médio de fechamento, contagens de dados incompletos).

## Estrutura de arquivos

Novos:
- `src/lib/reports/managerial.ts` — funções puras: agrega `ReportOrderRow[]` em um `ManagerialReport` (resumo executivo, distribuições, listas top, observações, incompletudes).
- `src/components/reports/ReportGenerateButton.tsx` — botão de destaque no header de `/relatorios`.
- `src/components/reports/ReportGenerateDialog.tsx` — modal com seletor de período (semana atual / mês atual / últimos 30 dias / personalizado), filtros opcionais (cliente, unidade, técnico, status, prioridade, tipo, somente concluídas, somente aguardando cobrança, somente com observações) e prévia resumida.
- `src/components/reports/ReportPeriodSelector.tsx` — chips de período + date pickers.
- `src/components/reports/ReportPreview.tsx` — cards de prévia (total OS, concluídas, horas, valor estimado, clientes/técnicos envolvidos) ou estado vazio.
- `src/components/reports/print/ManagerialReportDocument.tsx` — layout do PDF (capa, resumo executivo, status, top clientes, top técnicos, tipos de serviço, observações, lista detalhada). CSS print-only.
- `src/routes/_app.relatorios.imprimir.tsx` — rota de impressão; lê filtros dos search params (Zod), busca dados via `getReportOrders`, renderiza `ManagerialReportDocument`, dispara `window.print()` após hidratação. Layout próprio sem `AppShell`.
- `src/styles/print.css` (ou bloco `@media print` colocalizado) — esconde nav, ajusta margens A4, evita quebras dentro de linhas de tabela.

Alterados:
- `src/lib/api/reports.functions.ts` — incluir `description` no `ROW_SELECT` e no mapeamento `normalize`.
- `src/types/reports.ts` — adicionar `description` ao `ReportOrderRow`; tipos `ManagerialReport`, `ManagerialSummary`, `ClientAggregate`, `TechnicianAggregate`, `ServiceTypeAggregate`, `IncompleteCounters`; flags de filtro `onlyCompleted`, `onlyAwaitingBilling`, `onlyWithObservations`.
- `src/lib/reports/filters.ts` — Zod para os novos flags; serializador para search params da rota de impressão.
- `src/routes/_app.relatorios.tsx` — colocar `ReportGenerateButton` no header.

## Conteúdo do PDF

1. **Capa/cabeçalho**: logo Lemarc, título "Relatório Gerencial de Ordens de Serviço", período, data/hora de geração, nome do usuário (de `profiles`/sessão), identificação do sistema.
2. **Resumo executivo**: total OS, concluídas, em execução, pendentes, em revisão, aguardando cobrança, horas totais, tempo médio (somente OS com `opened_at` e `closed_at`), valor estimado (somente OS com `worked_minutes` e `hour_rate`), taxa de conclusão.
3. **Análise por status**: tabela com contagem + % por status.
4. **Top clientes**: nome, qtd OS, horas, valor estimado, concluídas, pendentes. Omite clientes sem dados.
5. **Top técnicos**: nome, OS atribuídas, concluídas, horas, tempo médio, valor estimado. OS sem técnico agrupadas como "Sem técnico atribuído".
6. **Tipos de serviço**: contagem por `service_type`; quando `service_type === 'outro'` exibe `service_type_other`.
7. **Observações**: somente OS com `description` não vazia — número, cliente, técnico, status, prioridade, abertura, fechamento, observação. Fallback "Nenhuma observação registrada nas OS deste período."
8. **Lista detalhada**: tabela com Nº, título, cliente, unidade, técnico, tipo, prioridade, status, abertura, início real (se disponível), fechamento, tempo trabalhado, valor estimado.
9. **Nota de responsabilidade dos dados** ao rodapé: contagens de OS sem técnico, sem `hour_rate`, sem `worked_minutes`.

## Cálculos (puros, em `managerial.ts`)

- Horas: `sum(worked_minutes ?? 0) / 60`.
- Valor estimado: `sum((worked_minutes/60) * hour_rate)` apenas quando ambos > 0.
- Tempo médio: média de `(closed_at - opened_at)` em OS encerradas.
- Taxa de conclusão: `concluídas / total`.
- Top N (clientes/técnicos): ordenado por qtd OS, depois horas.

## Fluxo do usuário

1. Em `/relatorios`, clique em **Gerar relatório gerencial**.
2. Dialog abre com período (semana/mês/30 dias/personalizado) + filtros.
3. Prévia é atualizada via `useQuery` chamando `getReportOrders` (mesmo server fn já usado pelo dashboard, cache compartilhado).
4. Se zero OS → mensagem e botão de download desabilitado.
5. **Baixar PDF** → `window.open` em `/relatorios/imprimir?...searchParams` (nova aba). Lá a página renderiza o documento, ajusta `document.title` para `relatorio-gestao-lemarc-AAAA-MM-DD.pdf` e chama `window.print()` após carregamento; `afterprint` fecha a aba (opcional).

## Segurança

- Toda busca via `getReportOrders` com `requireSupabaseAuth` (RLS).
- Rota `/relatorios/imprimir` fica sob `_app` (área autenticada).
- Nenhum dado sensível injetado pelo cliente; filtros validados por Zod.
- Sem service role no client.

## Responsividade & estilo

- Modal usa `Sheet` no mobile (`sm:max-w` no desktop), mantém glass industrial (azul/grafite/laranja).
- Botão fixo no header de `/relatorios`, sem cobrir BottomNav.
- PDF: fundo branco, tipografia legível, azul escuro nos títulos, laranja só em destaque pontual; tabelas com bordas finas; `page-break-inside: avoid` em linhas; `@page { size: A4; margin: 16mm }`.

## Validação

- `npm run build` e lint focado nos arquivos alterados.
- Teste manual: semana atual, mês atual, últimos 30 dias, personalizado, filtros por cliente/técnico, OS sem `worked_minutes`/sem `hour_rate`, período vazio, download e visualização do PDF em mobile/desktop.

## Não inclui

- Geração server-side de PDF (sem dependências novas).
- Envio por e-mail / agendamento.
- Persistência histórica dos relatórios gerados.
