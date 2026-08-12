# Auditoria das OS: 5 totais desalinhados após a limpeza

## Resultado do teste

Verifiquei todas as OS com apontamentos (127 linhas de horas):

- Nenhum bloco fantasma de 24h restou; a maior linha de horas é de 7h09.
- A OS **#1100** está correta: 31h20 de mão de obra, R$ 2.350,00 de horas, R$ 550,00 de deslocamento, **R$ 2.900,00** total.
- Todas as linhas criadas em 12/08 (#1086, #1088, #1089, #1095, #1107) têm sessão real correspondente no mesmo dia — são as correções intencionais, não horários inventados.
- **5 OS ficaram com o resumo financeiro desatualizado**: as linhas de horas foram corrigidas, mas os totais salvos não foram recalculados. Isso afeta tela, PDF e relatórios.

| OS | Horas gravadas | Total salvo (errado) | Total correto |
|----|----------------|----------------------|---------------|
| #1087 | 30h04 | 102h58 — R$ 7.722,50 | R$ 2.255,00 |
| #1078 | 30h04 | 47h31 — R$ 4.618,59 | R$ 3.135,34 |
| #1085 | 17h40 | 27h15 — R$ 2.423,75 | R$ 1.705,00 |
| #1058 | 11h54 | 11h55 — R$ 744,58 | R$ 743,75 |
| #1092 | 4h22 | 0h — R$ 0,00 | R$ 327,50 |

## Correção proposta

1. Recalcular e gravar, para essas 5 OS, minutos totais, valor de mão de obra e total geral a partir das linhas de horas já validadas, mantendo deslocamento e materiais como estão.
2. Atualizar também os campos legados da OS (minutos trabalhados e valor-hora médio) para que PDF e relatórios batam com a tela.
3. Manter cada OS marcada como consolidada, para que nada seja re-materializado automaticamente.
4. Rodar novamente a auditoria completa e confirmar zero divergências entre linhas de horas, resumo financeiro e campos da OS.

## Detalhes técnicos

- Migração/atualização pontual por ID de OS: `service_order_financials.total_labor_minutes/total_labor_cents/grand_total_cents = soma das service_order_labor_entries + displacement + materials`, e `service_orders.worked_minutes/hour_rate` derivados.
- Sem alteração de regras de cálculo: a trava de somente-leitura em OS encerradas e o limite de duração por apontamento permanecem como estão.
- Consulta de verificação final compara, para toda a base, soma das linhas × totais salvos × campos legados.
