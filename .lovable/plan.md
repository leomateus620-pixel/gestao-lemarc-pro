# Enviar notificação de teste da OS #1209 para o Leandro

## Situação confirmada
- Leandro Forster (lemarcfino@gmail.com, user_id `f3a5b4f7-0522-4593-9b6b-635eb385828f`) tem **2 aparelhos registrados** em `push_devices` (registros de hoje, 18:59 e 19:02 UTC) — a ativação no celular dele funcionou.

## O que será feito
1. Enviar notificação push de teste da OS #1209 ("MANUTEÇÃO ELETRICA.", descrição "MOTOR DESARMANDO.") para o Leandro, via `deliverPush` com `eventType: service_order_assigned` e `userIds` apenas dele.
2. Texto no padrão dos técnicos: título **"Uma OS foi vinculada a você"**, corpo **"OS #1209 — MANUTEÇÃO ELETRICA. · MOTOR DESARMANDO"**, link abrindo a OS #1209 ao tocar.
3. Confirmar a entrega no `notification_delivery_log` (sucesso/erro por aparelho) e reportar o resultado.

## Detalhes técnicos
- Nenhuma alteração de código ou banco — apenas o envio e a leitura do log de entrega.
- A notificação vai somente para os 2 aparelhos do Leandro; nenhum outro usuário é afetado.
