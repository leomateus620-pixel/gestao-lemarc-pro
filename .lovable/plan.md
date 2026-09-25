# Teste de notificação da OS #1209 para o Márcio Freddi (Android)

## Situação
A conta do Márcio Freddi (marciop.freddi@gmail.com) ainda não tem nenhum celular com as notificações ativadas. Por isso, um aviso enviado agora não chegaria em lugar nenhum. Baixar o app não basta: é preciso entrar nele e tocar em "Permitir".

## Passos
1. **Márcio, no Android:**
   - Abra o app Lemarc, ou lemarcgestao.com pelo Chrome, depois que as últimas mudanças forem publicadas.
   - Entre com a conta **marciop.freddi@gmail.com**.
   - Na janela "Receba avisos das suas OS", toque em **Permitir notificações**. Se ela não aparecer, use Mais → Notificações → Ativar notificações.
2. **Depois disso, eu:**
   - Confirmo que o celular dele ficou registrado.
   - Envio a notificação só para ele: **"Uma OS foi vinculada a você"**, com o texto "OS #1209 — MANUTEÇÃO ELETRICA. · MOTOR DESARMANDO". Ao tocar, abre a OS #1209.
   - Confirmo no registro de envios se chegou ou se deu erro, e te passo o resultado.

## Detalhes técnicos
- Verificar se existe uma linha em `push_devices` com o `user_id` do Márcio Freddi e `revoked_at` nulo.
- Enviar com `deliverPush` (`eventType: service_order_assigned`, `serviceOrderId` da OS #1209, `userIds` só com o dele), usando um script temporário dentro do projeto.
- Não altera nenhum código do app.
