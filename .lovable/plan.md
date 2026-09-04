# OS 1106 — igualar as horas do José às do Matheus

## Situação atual (conferida no banco)

Nesta OS, José e Matheus têm exatamente os mesmos horários em todos os dias, **exceto** em três blocos que hoje só o Matheus tem:

- 12/08 — 13:58 às 15:09 (1h11)
- 17/08 — 08:49 às 12:07 (3h18)
- 17/08 — 12:43 às 19:29 (6h45)

Esses blocos do José foram removidos numa correção anterior a pedido do Márcio (na época a informação era que nesses momentos só o Matheus trabalhou). Agora a orientação é o oposto: os dois trabalharam juntos o tempo todo.

## O que será feito

- Recriar para o José os três blocos acima, com data, hora de início e fim idênticos aos do Matheus.
- Recalcular a apuração de horas da OS 1106 para que os apontamentos e os valores financeiros reflitam os novos horários.
- Conferir no banco que José e Matheus ficam com o mesmo total de minutos, dia a dia.
- Nenhuma outra OS, nenhum outro técnico e nenhum outro dia é tocado.

## Resultado esperado

Ambos com o mesmo total: 4.487 minutos (74h47), somando 8.974 minutos de mão de obra na OS, com o valor total da OS atualizado automaticamente.

## Detalhes técnicos

- Inserção de 3 linhas em `service_order_time_sessions` para o técnico José (`cb3fc22f…`), espelhando os `started_at`/`ended_at`/`duration_minutes` das sessões `5b5fd682`, `d66924af` e `86513c7b`, com `source = 'admin_adjustment'` e nota de espelhamento.
- Rematerialização dos `service_order_labor_entries` e de `service_order_financials` pelo caminho de reconciliação já existente, mantendo as tarifas vigentes do José.
- Verificação final por consulta de totais por técnico e do `grand_total_cents`.
