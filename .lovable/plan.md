# Permitir revisar de novo uma OS já aprovada (incluindo adicionar técnico)

## Causa confirmada
A OS #1192 já está **aprovada** (revisão feita em 24/09 e finalizada em 25/09). O sistema recusa incluir um técnico na equipe de uma OS aprovada ("Não é possível adicionar técnicos a uma OS encerrada"), por isso o técnico não entrava.

## O que muda
1. Administradores podem incluir técnicos também em OS aprovadas. OS **canceladas** continuam bloqueadas.
2. Na revisão de uma OS aprovada, o admin pode adicionar técnico, lançar e editar as horas e salvar de novo. O total, a OS e o PDF são atualizados.
3. A OS continua aprovada, e a assinatura, os materiais e o deslocamento ficam como estão.
4. Validar na OS #1192: adicionar um técnico, lançar as horas, salvar e conferir a OS e o PDF.

## Detalhes técnicos
- `addServiceOrderTechnicians` (`serviceOrders.functions.ts` ~l.343): bloquear só `cancelled`. Já é exclusivo de admin (`is_admin`).
- Conferir o caminho de salvar/finalizar no `FinalizeServiceOrderDialog` para status `approved`: regravar `service_order_labor_entries` e recalcular `service_order_financials` sem mudar o status. A trava do banco só bloqueia `session_sync`, então os lançamentos manuais do admin passam.
- Manter a vinculação à equipe "best-effort" já aplicada no diálogo.
