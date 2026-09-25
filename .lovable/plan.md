# Teste de notificação push para o admin

## Situação atual
- 5 aparelhos com notificações ativas, 2 deles de administradores.
- Últimos envios hoje: avisos de "OS atribuída" e "OS finalizada" foram entregues com sucesso. Alguns técnicos ainda não ativaram as notificações.

## O que será feito
1. Enviar uma notificação de teste só para os aparelhos dos administradores, apontando para uma OS real já existente (não será criada OS falsa):
   - Título: "OS #<número> — <operação/tipo de serviço>"
   - Texto: descrição da OS (resumida).
   - Ao tocar, abre direto a página dessa OS.
2. Registrar o envio no histórico de entregas, como qualquer outro envio.
3. Informar o resultado: entregue ou com erro, e em quantos aparelhos.

## O que você precisa conferir
- No celular ou computador do admin, a notificação aparece e, ao tocar, abre a OS.
- Se não aparecer: confirme que as notificações estão ativadas nesse navegador (botão "Ativar").

## Detalhes técnicos
- Envio único feito pelo servidor, reaproveitando o envio já existente (`deliverPush`) com `eventType: "service_order_assigned"`, `serviceOrderId` da OS mais recente com descrição, destinado aos `user_id` com papel admin que têm aparelho ativo.
- O código do app não muda; nenhuma OS nem status é alterado.
