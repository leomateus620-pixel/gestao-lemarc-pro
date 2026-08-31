# Cadeia de horas da OS: correção na origem (sem mudar o visual)

Objetivo: quando o técnico pausa, retoma ou encerra, as horas do histórico passam a
existir na apuração no mesmo instante — sem depender de um admin abrir a tela. Nenhuma
mudança de layout, tipografia ou componente visual.

## O que a investigação confirmou

- `service_order_labor_entries` só aceita gravação de **admin** ou do **criador da OS**
  (políticas atuais: `is_admin()` ou `service_orders.created_by = auth.uid()`). Como
  `pauseWork` / `finishWork` / `finishColleagueWork` chamam `reconcileLaborFromSessions`
  com o client do usuário, o técnico recebe erro de permissão, o `catch` engole e a
  apuração fica vazia. Confirmado como a classe de bug relatada.
- As sessões já são gravadas com credencial de serviço (`getTimeSessionWriter`), a
  apuração não. É essa assimetria que produz "histórico existe, apuração vazia".
- `updateOwnTimeSession` bloqueia `finished`, o que contradiz a revisão de horas do
  técnico antes da assinatura (a OS já pode estar `finished` nesse momento).
- `handleTecnicoFinish` engole a falha do `finishWork` e muda o status para `finished`
  de qualquer forma — é assim que uma sessão fica aberta e, depois de 14h, é descartada
  pela proteção anti-horas-fantasma.
- Divergência do item 3 do briefing: no banco, a leitura da equipe **já funciona** para o
  técnico. A política de `SELECT` de `service_order_technicians` inclui
  `user_is_order_technician(...)`, e essa função **já considera** tanto a M2M quanto o
  `technician_id` legado. `technicians` tem `SELECT` liberado para autenticados. Ou seja:
  não há RLS a corrigir aqui. O que existe é um risco de dado: 3 colaboradores ativos sem
  login vinculado (`technicians.user_id IS NULL`) nunca satisfazem nenhuma política —
  serão tratados por diagnóstico, não por mudança de política.
- Pendências reais hoje (histórico > apuração), já classificadas:
  - #1094 (`finished`, não finalizada): 52 min no histórico, 26 min na apuração — falta
    exatamente um técnico. É backfill legítimo.
  - #1115 (`finished`): duas sessões de 18h52 atravessando a meia-noite — barradas de
    propósito pelo limite de 14h. Não entra em backfill automático.
  - #1106 (`running`): sessão fantasma de 7089 min + 2 sessões abertas. Não entra em
    backfill automático.
  - As demais (#1145, #1143, #1130, #1087, #1085, #1084, #1083, #1074, #1059, #1058…)
    estão `approved`/`review` com resumo financeiro finalizado: permanecem intocadas.

## Passos, arquivo por arquivo

### 1. Materializar a apuração com a mesma credencial das sessões
`src/lib/api/timeSessions.functions.ts`

- Em `pauseWork`, `resumeWork`, `finishWork`, `finishColleagueWork` e
  `saveOrderTimeReview`: chamar a reconciliação com o **writer de serviço**, e não com
  `context.supabase`. A autorização continua sendo feita antes por
  `assertOrderTimeAccess` (ou pela checagem de admin/técnico já existente em
  `finishColleagueWork`), então o writer só é alcançado por quem já passou pelo portão.
- `resumeWork` passa a reconciliar também (hoje não reconcilia): retomar depois de uma
  pausa longa é justamente quando o dia anterior precisa entrar na apuração.
- Parar de engolir `outcome.failed`: manter a retentativa única e, se ainda falhar,
  devolver ao cliente um campo de resultado (ex.: `laborPending`) com os minutos que
  ficaram fora, para o técnico ver um aviso em texto no toast existente. Sem novo
  componente, sem mudança de layout.
- `console.error` permanece para rastreio no log do servidor.

### 2. Reconciliação como escrita privilegiada e verificável
`src/lib/serviceOrders/laborSync.server.ts`

- Aceitar explicitamente dois clients: um de **leitura/autorização** e um de **escrita**
  (writer). Quando o chamador for técnico, escrita via writer; quando for a tela do
  admin, o comportamento atual é preservado.
- Manter intactas todas as travas de segurança já existentes: `finalized_at`,
  `labor_entries_adjusted_at`, `isAdminReviewedStatus`, `filterMaterializableSessions`
  (limite de 14h) e o gatilho `prevent_terminal_order_labor_sync`. Nenhuma delas é
  relaxada por este plano.
- A verificação final (`pendingLaborMinutes`) continua definindo `failed`, agora com esse
  valor efetivamente propagado para quem chamou.

### 3. Finalizar OS só depois de encerrar o tempo de verdade
`src/routes/_app.ordens.$id.tsx`

- `handleTecnicoFinish`: deixar de mudar o status quando o `finishWork` falhar. Regra:
  - sucesso, ou "não havia tempo em aberto" (caso legítimo) → segue para `finished`;
  - qualquer outra falha → não muda o status e mostra o erro no toast já existente.
- Se a reconciliação devolver minutos pendentes, avisar em texto no toast — sem alterar
  a UI da página.

### 4. Liberar a revisão de horas do técnico após encerrar
`src/lib/api/timeSessions.functions.ts` (`updateOwnTimeSession`)

- `lockedStatuses` passa a ser `review | approved | cancelled`, mais o bloqueio por
  `service_order_financials.finalized_at`. `finished` deixa de travar, alinhando com o
  fluxo "encerrou → revisa horas → assina".
- A dona da linha continua sendo checada (técnico só edita a própria sessão) e a trava por
  apuração já consolidada pelo admin continua valendo.

### 5. Backfill controlado das OS pendentes
Sem migração de dados às cegas.

- Rodar a reconciliação (com as mesmas guardas) nas OS **não finalizadas** que têm
  minutos pendentes. Pelo levantamento atual, isso resolve #1094.
- #1115, #1106 e as OS já revisadas/aprovadas **não** são tocadas: entram em uma lista de
  diagnóstico que eu te entrego, para você decidir caso a caso (elas têm sessão fantasma
  ou intervalo acima de 14h, e inventar horas aí seria pior que o bug).
- O banner de horas pendentes e o `reconcileOrderLabor` já existentes continuam sendo o
  caminho manual do admin.

### 6. Diagnóstico dos 3 colaboradores sem login
Relatório apenas: quais colaboradores ativos estão sem `user_id`. Sem criar usuário e sem
mexer em política — decisão sua depois.

## Migrations / RLS

- **Nenhuma migração é necessária.** A correção é de credencial no servidor, não de
  política. Não vou adicionar política de escrita de técnico em
  `service_order_labor_entries` (isso abriria a apuração financeira para o técnico), nem
  `USING (true)`, nem política para `service_role`.
- Gatilho `prevent_terminal_order_labor_sync` e a checagem de duração ficam como estão.

## Testes e validação

- `src/lib/serviceOrders/laborDerivation.test.ts` (17 testes) continua verde.
- Novos testes de unidade para a decisão de status do finalizar (sucesso / "sem tempo
  aberto" / falha real) e para a lista de status travados da edição própria.
- Verificação por consulta ao banco antes/depois: histórico versus apuração por OS, para
  confirmar que #1094 fecha e que nenhuma OS aprovada mudou.

## Riscos

- **Escrita privilegiada**: a reconciliação passa a rodar com credencial de serviço. Fica
  restrita ao handler, sempre após a autorização, e apenas para a OS já validada.
- **Finalizar mais rígido**: se o encerramento de tempo falhar, o técnico não conclui a OS
  na hora. É intencional — é preferível a uma OS `finished` com sessão aberta que depois
  perde horas. O erro aparece no toast.
- **`finished` editável**: amplia levemente a janela de edição da própria sessão pelo
  técnico. Mitigado pelas travas de `finalized_at` e de apuração já ajustada.
- **Volume de reconciliações**: `resumeWork` passa a reconciliar; é a mesma operação
  idempotente já usada em pausa/encerramento.

## O que NÃO vou mexer

- Nada de visual: layout, tipografia, espaçamento, componentes, `styles.css`.
- `TimeReviewDialog` e `SignatureBlock`: sem redesenho; só se beneficiam da cadeia correta.
- Travas anti-horas-fantasma: limite de 14h, divisão por dia, gatilho do banco,
  `finalized_at`, `labor_entries_adjusted_at`.
- OS já `approved`/`review` com resumo finalizado.
- Políticas de RLS, `is_admin`, `user_is_order_technician`, `user_owns_order`.
- Arquivos auto-gerados de integração e branches antigas — trabalho direto na main.
