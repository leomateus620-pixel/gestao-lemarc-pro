# Atualização automática do app no Android

## Situação atual
- O app instalado não guarda cópia antiga das telas. Sempre que ele é aberto do zero, já baixa a versão publicada mais recente.
- O problema aparece quando o Android deixa o app "dormindo" em segundo plano. Ao voltar para ele, a pessoa continua vendo a versão que já estava aberta.

## O que será feito
1. **Recarregar sozinho ao voltar para o app**: se o app ficou mais de 30 minutos em segundo plano, ele recarrega sozinho ao ser reaberto. Isso não acontece se houver um formulário aberto, como uma nova OS, a revisão de horas ou a assinatura, para ninguém perder o que estava preenchendo.
2. **Serviço de notificações sempre atualizado**: a parte que recebe as notificações passa a se atualizar sozinha a cada abertura, sem esperar o app ser fechado.
3. Nenhum botão "Atualizar" e nenhuma mensagem para o usuário. Tudo acontece em segundo plano.

## Detalhes técnicos
- `src/routes/_app.tsx`: listener de `visibilitychange`. Guarda a hora em que o app foi para segundo plano. Ao voltar depois de 30 min ou mais, chama `window.location.reload()`, a menos que `document.documentElement.dataset.fullscreenForm === "true"` ou haja um `[role=dialog]` aberto. Só roda quando `display-mode: standalone`.
- `public/firebase-messaging-sw.js`: adicionar `skipWaiting()` no install e `clients.claim()` no activate. Em `firebaseClient.ts`, chamar `registration.update()` após o registro.
- Sem service worker de cache de telas e sem verificação periódica de versão, para não criar problemas de cache antigo.
