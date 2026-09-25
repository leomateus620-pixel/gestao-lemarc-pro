# Ativar notificações push logo ao entrar no sistema

## Por que não chegou no celular
- Hoje só aparece um pequeno aviso "Ativar" no rodapé. Se ele for fechado, não volta, e não existe lugar nas Configurações para ativar depois.
- O app ainda não pode ser instalado na tela inicial. No iPhone, a Apple só entrega notificações de sites instalados na tela inicial ("Adicionar à Tela de Início"). Por isso nenhum iPhone recebe hoje.
- No Android (Chrome), funciona sem instalar, mas só se o aviso for aceito.

## O que será feito
1. **Janela de boas-vindas depois do login**: aparece uma janela explicando "Receba avisos das suas OS", com o botão "Permitir notificações". Os navegadores só mostram o pedido de permissão depois de um toque do usuário, então é o primeiro toque que pode ser pedido. Se o usuário tocar em "Agora não", a janela volta no próximo acesso.
2. **Tudo automático depois de permitir**: se a permissão já foi dada, em todo acesso o sistema registra o aparelho sozinho (inclusive se o navegador trocar o código do aparelho), sem perguntar nada.
3. **Instalar como app**: o sistema passa a poder ser instalado na tela inicial, com nome, ícone e cores da Lemarc.
   - No iPhone, fora do app instalado, a janela mostra o passo a passo: Compartilhar → "Adicionar à Tela de Início" → abrir pelo ícone → Permitir.
   - No Android, aparece o botão "Instalar app" quando o navegador oferecer.
4. **Área "Notificações" em Configurações** (para todos os usuários):
   - Mostra a situação: Ativadas / Bloqueadas / Não ativadas / Precisa instalar (iPhone).
   - Botões "Ativar notificações" e "Enviar notificação de teste" (manda uma notificação só para o seu aparelho).
   - Se estiver bloqueado, explica como liberar nas configurações do navegador.
5. Não muda nada nos avisos que já aparecem dentro do sistema.

## Depois de pronto, como testar no celular
- iPhone: abrir o site publicado no Safari → Adicionar à Tela de Início → abrir pelo ícone → entrar → Permitir → Configurações → "Enviar notificação de teste".
- Android: entrar pelo Chrome → Permitir → testar em Configurações.
- Observação: no preview do editor não é possível permitir notificações; o teste precisa ser feito no site publicado.

## Detalhes técnicos
- `public/manifest.webmanifest` (name, short_name, start_url `/dashboard`, display `standalone`, theme/background, ícones 192/512 PNG gerados a partir do logo) + `<link rel="manifest">`, `apple-touch-icon`, `apple-mobile-web-app-capable` no `__root.tsx`.
- Novo `PushPermissionGate` montado no `_app.tsx` no lugar do `PushOptIn`: detecta `Notification.permission`, iOS (`standalone` / `navigator.standalone`) e `beforeinstallprompt`; adiamento guardado no `localStorage` só até o próximo login.
- Registro silencioso: quando a permissão já for `granted`, chamar `enableWebPush()` uma vez por sessão (o `registerPushDevice` já faz upsert do token).
- Nova função no servidor `sendTestPush` (exige login) que usa `deliverPush` só para o `userId` de quem pediu.
- Seção "Notificações" em `src/routes/_app.configuracoes.tsx`, reutilizando `enableWebPush`.
