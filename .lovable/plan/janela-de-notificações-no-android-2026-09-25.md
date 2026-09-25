# Janela de notificações no Android

## Por que não apareceu
Hoje a janela "Receba avisos das suas OS" só abre em dois casos: quando o celular ainda não respondeu ao pedido, ou no iPhone sem o app instalado. Em qualquer outro caso ela fica escondida, sem aviso nenhum. No Android isso acontece quando:
- as notificações do site já foram **bloqueadas** antes (no Chrome, ou com o pedido silenciado);
- o sistema foi aberto **dentro de outro app** (link do WhatsApp, Instagram, Gmail), que não aceita notificações;
- a pessoa tocou em "Agora não" antes (a janela fica escondida até fechar o navegador);
- a versão publicada ainda é a antiga, sem a janela.

Ainda não sei qual desses casos aconteceu no seu Android. A correção abaixo cobre todos eles.

## O que muda
1. **A janela aparece também nos casos que hoje ficam escondidos**, com a orientação certa para cada um:
   - **Bloqueado:** "As notificações estão bloqueadas. Toque no cadeado ao lado do endereço → Permissões → Notificações → Permitir" e um botão "Já liberei, tentar de novo".
   - **Aberto dentro de outro app:** "Abra no Chrome: toque nos ⋮ e escolha 'Abrir no Chrome'" e um botão "Copiar link".
   - **Navegador sem suporte:** sugere usar o Chrome.
2. **"Agora não" pausa a janela por 24 horas**, e não mais só até fechar o navegador. Depois disso ela volta enquanto as notificações não estiverem ativadas. Se as notificações estiverem bloqueadas, a janela aparece no máximo uma vez por dia, para não incomodar.
3. **No Android, o botão "Instalar app"** continua aparecendo quando o Chrome permitir, junto com "Permitir notificações".
4. **Em "Mais" e em "Configurações"**, a área Notificações passa a mostrar os mesmos textos para cada caso.

## Como testar
Publique as mudanças. No Android, abra **lemarcgestao.com pelo Chrome** e entre no sistema. A janela deve aparecer. Toque em "Permitir" e depois me peça um envio de teste.

## Detalhes técnicos
- `src/lib/push/pushStatus.ts`: novo status `in-app-browser` (detecta WebView no user agent, por exemplo `; wv)`, FBAN, Instagram, WhatsApp, Line). O status `unsupported` fica separado dele.
- `src/components/app/PushPermissionGate.tsx`: abrir também para `denied`, `in-app-browser` e `unsupported`. O adiamento passa de `sessionStorage` para `localStorage` com um horário (24 h). Adicionar os painéis de instruções e o botão para tentar de novo (`getPushStatus()` + `enableWebPush()`).
- `src/components/app/NotificationSettings.tsx`: mesmos textos por status.
- Não mexe no envio pelo servidor, no service worker nem nos textos das notificações.
