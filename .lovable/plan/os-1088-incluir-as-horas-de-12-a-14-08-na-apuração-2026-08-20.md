# OS #1088 — incluir as horas de 12 a 14/08 na apuração

Correção pontual apenas desta OS. Nenhuma regra, tela ou cálculo do sistema será alterado.

## O que está errado hoje (verificado no banco)

- Os registros de tempo vão de 04/08 até 14/08, mas a apuração para em 12/08 07:41–07:54.
- JOSÉ MANOEL VERA ficou com um registro esticado de 12/08 15:10 até 14/08 13:52 (46h47 num único bloco) — registros assim são ignorados na apuração de propósito, para não somar horas irreais.
- Matheus tem um registro ainda aberto em 14/08 13:57, depois do "Serviço finalizado".
- Como a OS já está finalizada, o sistema não materializa horas novas sozinho — por isso os dias 12 (tarde), 13 e 14 nunca apareceram.
- As linhas do Matheus estão com R$ 0,00 por hora, então as horas dele não somam valor.

## Correção

1. Encerrar o registro aberto do Matheus (14/08 13:57), sem criar horas extras.
2. Substituir o registro esticado do JOSÉ pelos turnos reais, espelhando o Matheus:
   - 12/08 15:10 → 19:01
   - 13/08 07:45 → 12:07
   - 13/08 13:24 → 19:45
   - 14/08 07:57 → 13:51
3. Incluir na apuração de horas, para os dois técnicos, as linhas de 12/08 (tarde), 13/08 e 14/08 com as durações reais.
4. Aplicar o valor/hora cadastrado do Matheus nas linhas dele, para as horas deixarem de sair R$ 0,00.
5. Recalcular mão de obra, total geral e horas trabalhadas da OS, refletindo em tela, PDF e relatórios.

Resultado esperado: os dois técnicos com o mesmo histórico e as mesmas horas, apuração indo até 14/08 e valores coerentes.

## Detalhes técnicos

- Alterações de dados via ferramenta de dados: `service_order_time_sessions` (encerrar sessão aberta, reescrever a sessão longa do JOSÉ em 4 sessões), `service_order_labor_entries` (inserir as linhas faltantes com `entry_source` de ajuste administrativo e corrigir `hourly_rate_cents`/`subtotal_cents` do Matheus) e `service_order_financials` (recalcular `total_labor_minutes`, `total_labor_cents`, `grand_total_cents`), mais `service_orders.worked_minutes`/`hour_rate`.
- Nenhuma migração de schema e nenhuma mudança em `laborDerivation.ts` / `financials.functions.ts`.
