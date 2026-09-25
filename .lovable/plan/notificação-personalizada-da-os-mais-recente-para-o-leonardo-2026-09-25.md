# Notificação personalizada da OS mais recente para o Leonardo

## Dados confirmados
- OS mais recente: **#1209 — "MANUTEÇÃO ELETRICA."** (descrição: "MOTOR DESARMANDO.", status: em execução, id `08d0f0bd-a7d1-432d-bd91-194966bdc212`).
- Destinatário: **Leo** (leomateus620@gmail.com, user_id `4ebfbe47-2199-4516-ad01-24db612a8205`) — único Leonardo com celular registrado para push (iPhone ativo). O outro cadastro (leonardomateuspjjc56) não tem aparelho registrado, então não receberia.

## Envio
Usar o `deliverPush` já existente (`src/lib/api/push.server.ts`) com:
- Título: `OS #1209 — MANUTEÇÃO ELETRICA.`
- Corpo: `MOTOR DESARMANDO. Toque para abrir a OS.`
- `serviceOrderId`: id da OS 1209 → ao tocar na notificação, abre direto a página da OS (`/ordens/08d0f0bd-...`).
- `eventType`: `service_order_assigned`, metadata `type: "manual_test"`.

## Validação
1. Conferir `notification_delivery_log`: status `sent` com `fcm_message_id` para o aparelho do Leo.
2. Pedir ao usuário confirmar o recebimento no iPhone e o toque abrindo a OS #1209.

## Riscos
Nenhum — nenhuma alteração de código ou dados; apenas um envio de push e leitura de log.
