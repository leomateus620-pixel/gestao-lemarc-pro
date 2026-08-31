# Revisão de horas pelo técnico antes da assinatura

## Como vai funcionar

Ao clicar em **Coletar assinatura** (para técnico e para admin), abre primeiro uma tela de
**Revisão de horas** da OS. Só depois de confirmada a revisão o fluxo segue para a assinatura,
e no fim da assinatura o técnico escolhe **Finalizar OS** ou **Pausar (continua amanhã)**.

### Tela de revisão de horas

Lista limpa, agrupada por técnico da OS (o próprio e os colegas), com um cartão por intervalo:

```text
REVISÃO DE HORAS · OS #1146
Total revisado: 07:12

DOUGLAS FLORES ................................. 04:12
  31/08  07:54 → 12:06   4h12   [editar]
  31/08  13:25 → agora   em andamento  [encerrar agora]

JOÃO GABRIEL KLEIN ............................. 03:00
  31/08  09:00 → 12:00   3h00   [editar]
  + adicionar intervalo

[ Confirmar revisão e coletar assinatura ]
```

- Editar início/fim de qualquer intervalo (seus e dos colegas da OS), com motivo obrigatório.
- Adicionar intervalo que faltou para qualquer técnico da OS.
- Intervalos em andamento são **encerrados na revisão**, no horário confirmado pelo técnico —
  a OS já sai com todas as horas fechadas.
- Excluir intervalo continua exclusivo do admin.
- Validações: fim maior que início, sem sobreposição do mesmo técnico, sem data futura,
  máximo de 14h por intervalo (proteção contra "horas fantasma" que já existe).

### Obrigatoriedade

O botão de coletar assinatura não abre a assinatura sem a revisão confirmada. Se a revisão foi
confirmada e depois surgir tempo novo (retomada no dia seguinte), a revisão volta a ser exigida
antes da próxima assinatura/finalização.

### O que o admin vê

Ao confirmar, as horas revisadas entram na **Apuração de horas** já marcadas com selo
**"Revisado pelo técnico"** (com quem revisou e quando). Linhas não revisadas continuam
aparecendo normalmente, sem selo. A revisão não trava a apuração: o admin continua podendo
editar, excluir e finalizar como hoje.

## Detalhes técnicos

**Banco (uma migração)**
- `service_order_time_sessions`: `technician_reviewed_at`, `technician_reviewed_by`,
  `technician_review_note`.
- `service_order_labor_entries`: `technician_reviewed_at`, `technician_reviewed_by`
  (propagados a partir da sessão de origem na materialização).
- `service_orders`: `time_review_completed_at`, `time_review_completed_by`.
- RLS liberada corretamente para colegas da mesma OS: políticas de `INSERT`/`UPDATE` em
  `service_order_time_sessions` passam a aceitar `has_role(auth.uid(),'admin')
  OR public.user_is_order_technician(service_order_id)` (hoje o `UPDATE` só aceita o dono do
  cadastro, o que exclui técnico sem login vinculado). `DELETE` permanece só admin.
  Grants já existentes mantidos.

**Server functions** (`src/lib/api/timeSessions.functions.ts`)
- `getOrderTimeReview({ orderId })`: técnicos da OS + sessões de trabalho (abertas e fechadas)
  + estado da revisão.
- `saveOrderTimeReview({ orderId, edits[], additions[], closeOpen[], note })`: autoriza via
  `assertOrderTimeAccess` (admin ou técnico da OS), grava com credencial de serviço
  (`timeSessionWrite.server.ts`), aplica as mesmas validações do `updateOwnTimeSession`,
  registra auditoria em `metadata.adjustments`, marca `technician_reviewed_*`, grava
  `time_review_completed_*` e chama `reconcileLaborFromSessions`, retornando os minutos
  pendentes (0 esperado).
- Regra de "revisão vencida": revisão exigida quando existir sessão fechada/aberta com
  `ended_at`/`started_at` posterior a `time_review_completed_at`.

**Materialização** (`laborSync.server.ts` / `laborDerivation.ts`)
- Segmentos carregam `technician_reviewed_at/by` da sessão de origem para a linha de apuração.

**UI**
- Novo `src/components/ordens/TimeReviewDialog.tsx` (lista + edição inline + adicionar
  intervalo), responsivo mobile-first, usando os tokens do design system atual.
- `signature/SignatureBlock.tsx`: `Coletar assinatura` passa pela revisão quando pendente;
  depois abre `SignatureCaptureDialog`.
- `SignatureCaptureDialog`: ao concluir, exibe as duas saídas — **Finalizar OS** e
  **Pausar (continua amanhã)** — reaproveitando `PauseServiceOrderDialog` e a ação de
  finalizar já existentes.
- `LaborEntriesEditor.tsx` e PDF/apuração: selo "Revisado pelo técnico" nas linhas revisadas.

**Testes**
- Unitários em `laborDerivation.test.ts`: propagação do selo, sessão em andamento encerrada na
  revisão, sessão >14h continua fora da materialização automática, idempotência (revisar duas
  vezes não duplica linhas).
- Novos testes de regra de obrigatoriedade (revisão vencida após novo tempo).
- Verificação em preview: revisar como técnico da OS sem login vinculado e conferir que a
  apuração do admin recebe as linhas com selo.
