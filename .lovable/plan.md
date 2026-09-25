# Corrigir janela "Permitir notificações" duplicada e carregando sem parar (Android)

## Causa provável (pelo código)
- **Carregamento infinito**: ao ativar, o sistema registra o serviço de notificações e já pede o código do aparelho. No Android, esse serviço ainda está "instalando" nesse momento, e o pedido pode ficar esperando para sempre. Não existe tempo limite, então o botão fica girando.
- **Ativação repetida**: a ativação pode ser disparada mais de uma vez ao mesmo tempo, pela janela de boas-vindas, pelo sino e pela ativação silenciosa. Uma atrapalha a outra.
- **Janela duplicada**: a janela de boas-vindas pode reabrir por cima da área de Notificações (sino/Mais), porque ela só confere se existe outra janela na tela no instante em que vai abrir.

## O que será feito
1. Esperar o serviço de notificações ficar pronto antes de pedir o código do aparelho.
2. Colocar um tempo limite de 20 segundos. Se passar disso, o botão para de girar e aparece: "Não foi possível ativar agora. Tente de novo."
3. Permitir só uma ativação por vez. Se alguém tocar de novo, ou em outra tela, o app reaproveita a ativação que já está em andamento.
4. Mostrar a janela de boas-vindas só uma vez por acesso. Ela fecha sozinha assim que as notificações forem ativadas, e não abre quando a área de Notificações já estiver aberta.
5. Depois de publicar, conferir no registro de aparelhos se o Android foi registrado.

## Detalhes técnicos
- `firebaseClient.ts`: promessa única compartilhada (`inflight`); após `register`, aguardar `navigator.serviceWorker.ready` (ou o `statechange` até `activated`); envolver `getToken` + `registerPushDevice` em `Promise.race` com timeout de 20s; remover o `registration.update()` concorrente e chamá-lo só depois do token.
- `PushPermissionGate.tsx`: flag de módulo `promptShown` para abrir uma única vez; não abrir se `Notification.permission === "granted"`; o intervalo também para de tentar quando o status muda para granted.
- `NotificationSettings.tsx` / `PushOptIn.tsx`: passam a usar a mesma promessa única, sem lógica própria de ativação paralela.
