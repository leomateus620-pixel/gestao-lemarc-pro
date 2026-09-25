# Ativar notificações do Juan Rusch e enviar teste

## Situação
- Juan Rusch (jar-1983@hotmail.com) já tem o app instalado no Android.
- Nenhum aparelho dele está registrado para push ainda.
- A janela "Receba avisos das suas OS" abre automaticamente para o usuário logado — não é possível abri-la remotamente no celular dele.

## Plano
1. Juan, no Android dele:
   - Abre o app Lemarc (ou lemarcgestao.com no Chrome) e entra com o login dele.
   - A janela **"Receba avisos das suas OS"** aparece → toca em **"Permitir notificações"** e confirma no aviso do Android.
   - Se a janela não aparecer: **Mais → Notificações → Ativar notificações**.
2. Eu verifico no banco se o aparelho dele foi registrado (tabela de dispositivos).
3. Com o registro confirmado, envio a notificação de teste da OS #1209:
   - Título: **"Uma OS foi vinculada a você"**
   - Texto: **"OS #1209 — MANUTEÇÃO ELETRICA. · MOTOR DESARMANDO"**
   - Toque abre direto a OS #1209.
4. Confiro no registro de envios se a entrega foi confirmada e reporto o resultado.

## Observações
- Sem alteração de código; o fluxo de ativação já está publicado.
- Se ele já tocou em "Agora não" antes, a janela volta no próximo acesso (ou ele usa o atalho em Mais → Notificações).
