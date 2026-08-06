# Alerta de tempo em aberto do colega na OS

Quando um técnico encerra o tempo dele e outro técnico da mesma OS continua com o tempo rodando, o sistema passa a emitir um alerta no mesmo formato do aviso de "Nova OS atribuída a você".

## Como vai funcionar

1. Ao encerrar o tempo (apenas do próprio técnico), o sistema verifica se ainda existe sessão de trabalho aberta de outro técnico da mesma OS.
2. Se existir:
   - **Quem encerrou** vê o alerta na hora, na própria tela da OS: "Você encerrou seu tempo, mas o tempo de [colega] continua aberto".
   - **O colega** recebe um alerta persistente que aparece ao abrir o app (mesma janela usada hoje para nova OS atribuída).
3. Os dois alertas têm as ações: **Encerrar tempo do colega / Encerrar meu tempo**, **Abrir OS** e **Ver depois**.
4. O alerta é dispensado automaticamente quando o tempo em aberto é encerrado (por qualquer caminho), evitando aviso "fantasma".

## Detalhes técnicos

**Banco (migração)**
- Novo tipo de notificação `service_order_open_time_alert` em `service_order_notifications`.
- A restrição única atual `(service_order_id, technician_id, type)` já permite um alerta por técnico/OS; o registro é reaproveitado (reset de `read_at`/`dismissed_at`) em novas ocorrências.
- Ajuste na policy de INSERT para permitir que um técnico atribuído à OS gere a notificação do colega (hoje o INSERT é limitado a dono/admin).

**Backend (`src/lib/api/`)**
- `notifications.functions.ts`: nova função `syncServiceOrderOpenTimeAlerts(sb, orderId, actorUserId)` que lê as sessões abertas da OS, cria/reativa o alerta para o técnico com tempo aberto e dispensa alertas cujo tempo já foi encerrado. Metadados guardam o nome do colega que encerrou e do técnico com tempo aberto.
- `timeSessions.functions.ts`: chamada dessa sincronização ao final de `finishWork` (e também de `pauseWork`, para limpar alertas resolvidos). `finishWork` passa a retornar `{ ok, openTimeAlert }` com os dados do colega ainda em aberto, para o alerta imediato na tela.

**Frontend**
- `src/types/notifications.ts`: novo tipo de notificação com os campos do colega/técnico em aberto.
- Novo `src/components/dashboard/TechnicianOpenTimeNotification.tsx` reutilizando o layout do aviso atual (mesma folha inferior/modal), com botão primário "Encerrar tempo do colega".
- `src/routes/_app.dashboard.tsx`: a consulta de notificações passa a incluir o novo tipo e renderiza o alerta correspondente.
- `src/components/ordens/ServiceOrderTimeControl.tsx` (ou o ponto que chama `finishWork`): exibe o alerta imediato para quem encerrou, com a ação de encerrar o tempo do colega e invalidação das consultas de tempo/apuração.
- `src/hooks/useTechnicianNotifications.ts`: consulta unificada dos alertas pendentes.

**Validação**
- Teste unitário da regra que decide quem recebe o alerta (sessões abertas x técnico que encerrou), em `src/lib/serviceOrders/`.
- Verificação no preview: encerrar tempo de um técnico em OS com dois técnicos e conferir o alerta imediato, a ação de encerrar o colega e o desaparecimento do alerta após resolvido.
