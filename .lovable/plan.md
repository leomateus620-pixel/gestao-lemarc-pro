# Corrigir horas da OS #1073 (Douglas) e a exibição por técnico

## O que está errado hoje

- DOUGLAS FLORES tem **uma única sessão de cronômetro que ficou aberta** de 21/07 13:41 até 07/08 08:26 (24.166 min = 402:46). Ela só fechou quando a OS foi finalizada.
- Como a apuração fatia sessões longas por dia, o PDF ganhou blocos de 24:00 de 22/07 a 06/08 e o total da OS foi para 25.476 min.
- OMAR ALVES e SEBASTIAN MARQUXS não têm sessão de cronômetro, só lançamentos de apuração — corretos no PDF, mas o card "Controle de tempo da OS" mostra 00:00 / Aguardando porque ele lê apenas sessões.

## Correção dos dados da OS #1073

Substituir a sessão de 402h do Douglas por duas sessões iguais às do Omar Alves:

```text
21/07/2026  08:00 -> 12:00   (240 min)
22/07/2026  13:30 -> 18:40   (310 min)
Total Douglas: 09:10
```

Passos:
1. Apagar a sessão aberta indevida do Douglas.
2. Criar as duas sessões acima para ele, marcadas como ajuste do admin (motivo registrado no histórico).
3. Apagar os lançamentos de apuração antigos do Douglas (os blocos de 24:00 e os trechos de 21/07 13:41 e 10:00) e regerar a partir das novas sessões.
4. Recalcular os totais da OS: mão de obra do Douglas passa a 09:10 no valor-hora dele, e o total da OS deixa de somar as ~393h fantasmas.

Resultado esperado no PDF: Douglas com 2 linhas (04:00 e 05:10, subtotal 09:10), Omar 09:10 e Sebastian 05:30 — sem nenhum bloco de 24:00.

## Ajuste no app (para não repetir na leitura)

No card "Controle de tempo da OS", as horas por técnico passam a considerar também os lançamentos da apuração, não só o cronômetro:
- Técnico sem sessão de cronômetro mas com horas apuradas passa a exibir essas horas em vez de 00:00.
- O selo "Aguardando" só aparece quando o técnico realmente não tem tempo nenhum registrado.
- Quem tem sessão aberta continua com o cronômetro somando ao vivo, como hoje.

Nenhuma mudança na regra de cálculo de valores: cada técnico continua sendo pago pelas próprias horas e pelo próprio valor-hora.

## Detalhes técnicos

- Dados: `DELETE`/`INSERT` em `service_order_time_sessions` e `service_order_labor_entries` para a OS `05316f48-...`, depois recomputar `service_order_financials` (`total_labor_minutes`, `total_labor_cents`, `grand_total_cents`) mantendo deslocamento e materiais.
- `labor_entries_adjusted_at` fica preenchido para que a apuração corrigida não seja sobrescrita pela derivação automática.
- Frontend: `src/components/ordens/ServiceOrderTimeControl.tsx` (`displayedMinutesFor`, badge de estado) usando o `minutesByTechnician` já retornado por `getOrderLaborOverride`, com fallback para o cronômetro.
