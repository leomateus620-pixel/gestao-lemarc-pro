# Liberar "Mais" e aviso de notificações para técnicos

## O que foi verificado
- O código atual já mostra "Mais" na barra inferior dos técnicos e a área Notificações dentro dela, e a janela "Receba avisos das suas OS" já é carregada para todos.
- Essas mudanças ainda não chegaram no celular deles: o app instalado guarda a versão antiga até ser publicado e atualizado.
- A janela de permissão pode ser escondida por outras janelas que abrem ao mesmo tempo no painel (ex.: "OS vinculada a você", "tempo aberto do colega"), ou ficar 24h oculta após "Agora não".

## O que será feito
1. **Atualização automática do app instalado**: quando houver versão nova, o app se atualiza sozinho ao abrir (sem precisar desinstalar).
2. **Janela de permissão mais confiável**: espera as outras janelas do painel fecharem e então aparece; também aparece ao abrir uma OS.
3. **Sino de notificações no topo da tela** para técnicos e admins, sempre visível: toque abre direto "Ativar notificações" / "Enviar teste" — não depende do menu "Mais".
4. **"Agora não"** passa a ocultar só até o próximo acesso (não 24h) enquanto as notificações não estiverem ativas.
5. Publicar e conferir com um técnico (Juan Rusch): quando o aparelho dele aparecer registrado, envio o teste da OS #1209.

## Detalhes técnicos
- `BottomNav.tsx`: manter `/mais` em `TECNICO_ROUTES` e mostrar "Mais" também durante `loading`.
- `PushPermissionGate.tsx`: abrir apenas quando nenhum outro `[role=dialog]` estiver aberto (checagem periódica); snooze em `sessionStorage`.
- `AppShell.tsx`: botão de sino que abre um `Dialog` com `NotificationSettings`.
- Service worker/PWA: `skipWaiting` + `clients.claim` e recarregar ao detectar nova versão.
- Sem mudanças em horas, deslocamento, assinatura ou permissões de dados.
