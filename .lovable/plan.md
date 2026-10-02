# Mostrar "PAUSADA" nas OS em que a equipe pausou

## Resumo
A palavra "Pausada" só aparece na tela. O status gravado na OS continua `running`, e o enum, as horas, a apuração, os relatórios de faturamento e as notificações push não mudam. Uma única função decide o que mostrar a partir das sessões de trabalho. Todos os pontos da tela usam essa função.

## Regra final (vários técnicos)
A regra só vale para OS com `status = 'running'`. Qualquer outro status continua igual a hoje, então as OS finalizadas ou aprovadas cuja última sessão foi uma pausa não mudam.

Para cada técnico com sessão de trabalho (`kind='work'`) na OS, a regra olha a sessão mais recente dele:
- **Em execução**: algum técnico tem sessão aberta (`ended_at IS NULL`). Se outro técnico estiver pausado, aparece um sub-indicador discreto "1 pausado".
- **Pausada**: nenhum técnico tem sessão aberta, e pelo menos um tem a última sessão com `end_reason='pause'`. O motivo vem da pausa mais recente. Exemplo: "Pausada · Almoço". Se os motivos forem diferentes, aparece só "Pausada".
- **Running sem sessão aberta e sem pausa** (todos encerraram com `finish`/`manual` e a OS não foi finalizada): continua "Em execução", como hoje. Mostrar "Aguardando finalização" seria outro pedido, por isso fica fora deste plano.
- **Sem nenhuma sessão**: "Em execução", como hoje.
- **Pausa de um dia para o outro** (fim de expediente, hotel): continua "Pausada" até alguém retomar. O tempo que a OS ficou pausada não importa. A regra de 14h e da meia-noite só vale para sessões abertas, não para pausas.
- **Sessão aberta e esquecida, passando da meia-noite**: continua "Em execução". O sistema de horas já ignora essa sessão no cálculo. A tela não muda isso.

## Função derivada (nova)
`src/lib/serviceOrders/displayStatus.ts`:
- `getOrderDisplayStatus(order, sessions)` retorna `{ key: ServiceOrderStatus | "paused", label, pauseReason, pausedCount, runningCount }`.
- Reaproveita `getTechnicianState` de `timeSessions.ts`, sem alterar esse arquivo.
- Também exporta `displayStatusLabel` e `displayStatusTone`. "paused" usa os tons âmbar que o `ServiceOrderTimeControl` já usa.

## Como trazer as sessões para a lista inteira (sem N+1)
- Novo `listRunningOrderTimeState` em `timeSessions.functions.ts`, com `requireSupabaseAuth` e RLS normal.
  - Primeiro busca os ids das OS `running`.
  - Depois faz uma única query em `service_order_time_sessions` com `.in(service_order_id)` e `kind='work'`, buscando só as colunas mínimas: id, service_order_id, technician_id, started_at, ended_at, end_reason, pause_reason.
  - Monta a resposta no servidor: `{ [orderId]: { key, pauseReason, pausedCount, runningCount } }`. A lista recebe só esse resumo, sem as sessões.
- Hoje são cerca de 4 OS running, então o volume é pequeno. Não precisa de mudança no banco.
- Alternativa, não recomendada agora: uma view ou RPC só para leitura. Fica para depois se o número de OS em andamento crescer muito.
- Novo hook `useRunningOrderTimeStateQuery()` em `useServiceOrders.ts`, com a chave `["running-order-time-state"]`.
- Os componentes leem o mapa por id. Se faltar um id, mostram o status gravado, como hoje.

## Onde aparece
- `ServiceOrderCard.tsx`: o `ServiceOrderStatusBadge` aceita um `displayStatus` opcional. O badge e a cor de destaque (accent) do card ficam âmbar quando pausada, com o motivo junto.
- `_app.ordens.index.tsx` (lista de OS): passa o estado para os cards e linhas.
  - O filtro de status ganha a opção **"Pausadas"**.
  - "Em campo" continua incluindo as pausadas, para o total em andamento não mudar.
- `ServiceOrderIslandRow.tsx`: mesmo badge.
- `_app.ordens.$id.tsx` (cabeçalho do detalhe): o chip usa a função derivada com as sessões que a tela já carrega. Não faz busca nova.
- `TechnicianOrderCard.tsx` (app do técnico): `timeStateLabel` passa a mostrar "Pausada · motivo".
- Contadores do Início e da Central (`metrics.ts`, `OperationTodayCard.tsx`, `MetricCard`): "Em andamento" fica com o mesmo total. Embaixo, mostra o desdobramento "X em execução · Y pausadas".
  - `statusBucket` não muda.
  - O desdobramento é calculado à parte, com o mapa.
- Relatórios gerenciais, PDFs e faturamento: **não mudam**. Os filtros e KPIs continuam usando `order.status`. Isso fica explícito no código.

## Troca automática ao pausar ou retomar
1. **Invalidação**: depois de start, pause, resume, finish, finishColleagueWork e dos ajustes de sessão do admin, invalidar `["running-order-time-state"]` e `["service-orders"]`. A tela de quem tocou no botão troca na hora.
2. **Para os outros aparelhos** (o Márcio na Central vendo o técnico pausar), a recomendação é atualizar a cada 30 s (`refetchInterval: 30_000`) e também ao voltar para a aba (`refetchOnWindowFocus`), só nessa consulta leve.
   - Prós: simples, sem mudança no banco, respeita a RLS, custo baixo (uma query pequena).
   - Contras: até 30 s de atraso.
3. **Realtime em `service_order_time_sessions`** (opcional, fora deste plano):
   - Prós: troca instantânea.
   - Contras: precisa de uma migração para adicionar a tabela à publicação; a RLS é avaliada a cada evento; envolve mais conexões; e o hábito do projeto até agora é usar só react-query.
   - Proponho deixar para uma segunda etapa, se 30 s não bastar.

## O que NÃO muda
O enum `service_order_status` e o `service_orders.status`:
- `startWork`, `pauseWork` e `resumeWork` continuam iguais, só com as invalidações a mais.

Cálculo de horas:
- `laborSync`, `laborDerivation`, materialização, `isAbandonedSession`/`isSuspiciousSession` e as regras de 14h e da meia-noite continuam iguais.

Documentos, faturamento e avisos:
- PDFs de horas e o faturamento continuam iguais.
- As notificações push continuam iguais: pausar ou retomar não envia aviso, e não proponho criar um.

## Mudanças de banco
Nenhuma.

## Testes
Novo `src/lib/serviceOrders/displayStatus.test.ts`:
- A equipe toda pausada (Juan e Omar no almoço, como na #1226) dá "Pausada · Almoço".
- Um técnico pausado e outro trabalhando dá "Em execução" com pausedCount 1.
- Sem nenhuma sessão dá "Em execução".
- OS finished ou approved com a última sessão em pausa mostra o status original.
- Pausa `fim_expediente` iniciada ontem e sem retomar dá "Pausada".
- Sessão aberta passando da meia-noite dá "Em execução".
- Retomar depois da pausa (nova sessão aberta) volta para "Em execução".
- Todos os técnicos encerrados com `finish`, sem pausa, dá "Em execução".
- pending, dispatched, transit e cancelled não mudam.

Regressão:
- `laborDerivation.test`, `dashboardTechnicianTime.test` e `reports.test` continuam passando sem alteração. Isso confirma que os totais de horas não mudaram.

Verificação no navegador:
- A #1226 aparece "Pausada · Almoço" na Central, na lista e no detalhe.
- O filtro "Pausadas" mostra a #1226.
- O contador mostra o desdobramento.

## Riscos
- Diferença de até 30 s entre aparelhos, que se resolve com o Realtime depois.
- O app do técnico usa a mesma consulta, e a RLS do técnico só deixa ver as OS dele. Isso está correto, mas o mapa vem parcial para ele, que é o esperado.
- Dados antigos inconsistentes, como sessões espelhadas sem `technician_id`: essas sessões são ignoradas na regra para evitar uma "pausa" falsa.

## Perguntas em aberto
1. Para "running" com todos os técnicos encerrados e sem pausa, mantenho "Em execução" ou quer um rótulo "Aguardando finalização"? O plano mantém "Em execução".
2. O filtro "Pausadas" fica como opção separada e também dentro de "Em campo"? O plano faz os dois.
3. Atualizar a cada 30 s é suficiente, ou já quer o Realtime nesta entrega?
