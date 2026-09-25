# Relatórios: visão por técnico (OS, data, valor dele)

## Objetivo
No menu Relatórios, quando o admin selecionar um técnico no filtro "Técnico ou colaborador", exibir uma lista clara de todas as OS relacionadas a ele no período, com: número da OS, data, horas dele naquela OS e o valor dele naquela OS (soma dos lançamentos de mão de obra dele), além de totais no rodapé.

## Estado atual (confirmado)
- O filtro de técnico já existe (`technicianId` em `reportSearchSchema` e em `ReportsFilters`) e filtra as OS pela atribuição.
- Porém a lista atual (`ReportOrdersTable`) mostra valores da OS inteira (horas totais, valor estimado da OS), não o valor individual do técnico.
- O valor individual por técnico existe em `service_order_labor_entries` (technician_id, work_date, duration_minutes, hourly_rate_cents, subtotal_cents).

## O que será construído

### 1. Nova consulta no servidor — `getTechnicianReport` (src/lib/api/reports.functions.ts)
- Recebe `technicianId` + filtros de período (respeita `period`, `from`, `to`; demais filtros de OS como status/cliente também aplicados).
- Busca os lançamentos de `service_order_labor_entries` daquele técnico, juntando número/título/data da OS.
- Agrupa por OS e retorna por linha: `orderId`, `number`, `title`, `work_date` (ou intervalo de datas quando houver vários dias), `minutes` (soma das horas dele), `value_cents` (soma dos subtotais dele).
- Retorna também totais: quantidade de OS, horas totais e valor total do técnico no período.

### 2. Nova seção na página de relatórios (src/routes/_app.relatorios.tsx)
- Quando `filters.technicianId` estiver preenchido, aparece uma seção "Desempenho do técnico" acima da lista geral de OS:
  - Cabeçalho com nome do técnico e 3 cartões-resumo: OS no período, Horas no período, Valor total no período.
  - Tabela (desktop) / cartões (mobile) com colunas: Nº da OS, Data, Título, Horas dele, Valor dele.
  - Cada linha com link para a OS (`/ordens/$id`).
  - Rodapé com totais.
- Sem técnico selecionado, a página fica exatamente como hoje.

### 3. Componente novo
- `src/components/reports/TechnicianReportSection.tsx` — recebe os dados da consulta e renderiza resumo + lista, seguindo o visual atual dos relatórios (cartões `lemarc-report-card`, mesma tipografia).

## Fora de escopo
- Não muda filtros existentes, KPIs, gráficos, exportação nem a visão por cliente.
- Não altera dados de horas nem regras de cálculo — apenas leitura.

## Validação
- Build + typecheck.
- Teste com um técnico real (ex.: Douglas) conferindo que a soma por OS bate com os lançamentos de mão de obra dele.
- Conferir mobile e desktop.
