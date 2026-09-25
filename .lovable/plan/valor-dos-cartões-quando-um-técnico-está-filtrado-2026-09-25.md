# Valor dos cartões quando um técnico está filtrado

## O que acontece hoje
- **Valor total no período (R$ 10.755)** é o valor real do Juan: soma só as horas que ele lançou em cada OS, com o valor/hora dele.
- **Valor estimado (R$ 23.646)** soma o valor da OS inteira, com as horas de todos os técnicos que trabalharam nela. O filtro de técnico só escolhe quais OS entram na conta. Por isso o número fica maior.
- O mesmo acontece com **Horas trabalhadas (298,1h)**, **Ticket médio** e o **gráfico mensal**: mostram a OS toda, e não só a parte do técnico. As horas certas dele são 126,5h.

## Correção
Quando um técnico estiver selecionado, os cartões da tela Relatórios passam a usar só a parte dele, com os mesmos números da tela dedicada:
- **Valor estimado** = soma do valor que ele lançou nas OS do período (R$ 10.755 no caso do Juan). O nome muda para "Valor do técnico".
- **Horas trabalhadas** = horas lançadas por ele (126,5h).
- **Ticket médio** = valor dele ÷ OS concluídas dele.
- Contagem de OS, status e o tempo médio de conclusão ficam iguais.
- Sem técnico selecionado, nada muda.

## Detalhes técnicos
- Em `reports.functions.ts`, quando houver `technicianId`, buscar as `service_order_labor_entries` desse técnico para as OS filtradas (mesma consulta de `getTechnicianReport`). Depois sobrescrever em cada linha `worked_minutes_effective` e `estimated_value` com a soma das entradas dele (duration_minutes, subtotal_cents/100). OS sem lançamento dele ficam com 0.
- Assim `computeOverview`, `computeSeries` (trend) e a exportação usam automaticamente a parte do técnico.
- Rótulo do cartão em `_app.relatorios.index.tsx`: "Valor do técnico" quando o filtro estiver ativo.
- Conferir no navegador: Juan, 01/09 a 25/09 → cartões com R$ 10.755 e 126,5h, iguais aos da tela dedicada.
