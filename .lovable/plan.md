# Revisão de horas: adicionar intervalo e cronômetro ao vivo

Duas melhorias no diálogo "Revise os horários antes da assinatura", sem mudar o restante do fluxo de assinatura.

## 1. Botão "+ Adicionar horário"

- Novo botão no topo da lista de intervalos, dentro do próprio diálogo.
- Abre um formulário curto: técnico (lista da equipe da OS), data/hora de início, data/hora de fim e motivo obrigatório (mín. 3 caracteres, fica registrado como auditoria).
- Regras de segurança: admin pode lançar para qualquer técnico da OS; técnico só para si mesmo. Bloqueia OS já revisada/aprovada/cancelada ou com apuração finalizada, início no futuro, fim antes do início, duração acima de 14h e sobreposição com outro intervalo do mesmo técnico.
- Depois de salvar, a lista, o total e a apuração de horas são atualizados na hora (mesma reconciliação já usada na edição), então o PDF, os valores de mão de obra e os relatórios acompanham.

## 2. Cronômetro em tempo real

- Intervalos ainda em andamento passam a exibir o tempo correndo (atualiza a cada segundo), somando ao card "Total" do diálogo — hoje eles aparecem como 00:00.
- Marcador visual de "em andamento" (ponto pulsante) na linha do intervalo aberto.
- O mesmo cálculo ao vivo é aplicado no "Controle de tempo da OS", para o total exibido lá bater com o do diálogo em tempo real.
- Ao confirmar, o intervalo aberto continua sendo encerrado no instante da confirmação, como já acontece.

## Detalhes técnicos

- `src/lib/api/timeSessions.functions.ts`: nova server fn `createManualTimeSession` (autoriza via `assertOrderTimeAccess`, valida técnico/OS/status/limites/sobreposição, grava com o writer de serviço marcando `source`/`adjustment_reason`, chama `reconcileLaborSafe`). `getOrderTimeReview` passa a devolver também os técnicos elegíveis para lançamento.
- `src/components/ordens/TimeReviewDialog.tsx`: botão "+ Adicionar horário" com formulário inline, hook de tick de 1s para durações ao vivo, total somando sessões abertas, invalidação das queries existentes.
- `src/components/ordens/ServiceOrderTimeControl.tsx`: tick de 1s (hoje 30s) para o total e por técnico refletirem o cronômetro real.
- Testes: `bunx vitest run` (inclui `laborDerivation.test.ts`) e validação no preview autenticado — lançar um intervalo manual, ver o cronômetro correndo e confirmar que a apuração de horas recebe os minutos.
