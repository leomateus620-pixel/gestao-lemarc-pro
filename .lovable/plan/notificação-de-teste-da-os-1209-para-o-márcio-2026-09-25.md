# Notificação de teste da OS #1209 para o Márcio

## Objetivo
Enviar uma notificação push de teste da OS #1209 para o Márcio Freddi (marciop.freddi@gmail.com, admin), que já tem 2 aparelhos registrados.

## Passos
1. Confirmar os aparelhos registrados do Márcio em `push_devices`.
2. Chamar `deliverPush` no servidor com o texto de admin:
   - Título: **OS #1209 — MANUTEÇÃO ELETRICA.**
   - Corpo: **MOTOR DESARMANDO. Toque para abrir a OS.**
   - Link: abre a página da OS #1209 ao tocar.
3. Conferir o registro de envios (`notification_delivery_log`) e reportar quantos aparelhos receberam e se houve erro.

## Sem mudanças de código
Apenas envio e verificação — nenhum arquivo do sistema será alterado.
