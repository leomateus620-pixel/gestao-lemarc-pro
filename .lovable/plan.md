# Reenviar notificação push de teste para o admin

## Objetivo
Enviar novamente a notificação de teste para o usuário admin, agora que o celular já foi configurado, e confirmar a entrega.

## Passos
1. Verificar se o celular do admin foi registrado: consultar `push_devices` (tokens ativos, sem `revoked_at`) para o usuário admin.
2. Disparar o envio de teste usando a função já existente `sendTestPush` (`src/lib/api/push.functions.ts`), que envia via FCM para todos os aparelhos ativos do admin com o título "Teste de notificação — Gestão Lemarc".
3. Confirmar o resultado no logbook `notification_delivery_log` (status `sent`/`delivered` ou erro do FCM, ex.: token inválido/não registrado).
4. Se houver erro de token, revogar o token antigo e orientar o admin a reabrir o app no celular para registrar de novo.

## Validação
- Logbook mostra entrega bem-sucedida para o novo aparelho.
- Admin confirma o recebimento da notificação no celular.

## Riscos
Nenhum — não altera código nem dados de OS; apenas envia uma notificação de teste e lê logs.
