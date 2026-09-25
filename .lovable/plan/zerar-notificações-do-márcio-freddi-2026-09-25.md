## Zerar notificações do Márcio Freddi

Somente para o Márcio (marciop.freddi@gmail.com). Nenhum outro usuário é alterado.

### Situação atual
O Márcio tem 3 aparelhos no cadastro de notificações: 2 marcados como ativos e 1 já desativado. Pelo registro, os envios deram certo, mas ele não recebeu nada. Isso indica que os aparelhos registrados não estão mais válidos no celular dele.

### O que será feito
1. Apagar os 3 aparelhos registrados do Márcio.
2. Manter o histórico de envios do registro de notificações, para consulta.
3. Conferir que ele ficou sem nenhum aparelho e que os outros usuários continuam iguais.

### Depois, no celular dele (Android)
1. Em Configurações do Android → Apps → Chrome (ou app Lemarc) → Notificações: deixar ligado.
2. No Chrome, abrir lemarcgestao.com → cadeado → Configurações do site → "Limpar e redefinir".
3. Desinstalar o app Lemarc e instalar de novo (3 pontinhos → "Instalar app").
4. Abrir pelo ícone, entrar e tocar em "Permitir notificações".
5. Me avisar para eu confirmar o novo registro e mandar o teste.

### Detalhes técnicos
- `DELETE FROM push_devices WHERE user_id = '28326a48-46d4-4a26-942c-d087e6d05036'` (ids 048e9eed..., 629c1ab2..., f7cfe2e2...).
- `notification_delivery_log` fica como está.
- Não muda código.
