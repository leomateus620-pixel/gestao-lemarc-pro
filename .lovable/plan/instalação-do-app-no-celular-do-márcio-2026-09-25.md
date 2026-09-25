# Instalação do app no celular do Márcio

## Situação atual (confirmada no código)

- O app já é instalável: `public/manifest.webmanifest` existe com nome "Gestão Lemarc", ícones e `display: standalone`.
- Já existe um botão **"Instalar app"** em dois lugares:
  - Na janela "Receba avisos das suas OS" (`PushPermissionGate.tsx`), que abre ao entrar no sistema.
  - Na área **Notificações** (`NotificationSettings.tsx`), em "Mais" e no sino do topo.
- Esse botão só aparece quando o navegador oferece a instalação (`beforeinstallprompt`). No Android/Chrome isso nem sempre acontece de imediato — e eu não consigo abrir a janela no celular dele remotamente; ela só aparece quando ele entra no sistema.

## O que será feito

1. **Guia de instalação manual no Android**: quando o botão "Instalar app" não estiver disponível, a janela e a área Notificações passam a mostrar o passo a passo manual: "No Chrome, toque nos 3 pontinhos (⋮) → 'Instalar app' ou 'Adicionar à tela inicial'". Assim o Márcio consegue instalar mesmo sem o botão automático.
2. **Sem mudança de visual** além desse texto de ajuda; fluxos de notificações, horas e assinatura intactos.

## O que o Márcio precisa fazer (mensagem para enviar a ele)

```text
Márcio, para instalar o app Lemarc no seu Android:
1. Abra lemarcgestao.com no Google Chrome e entre com seu login
2. Se aparecer a janela "Receba avisos das suas OS", toque em "Instalar app"
3. Se não aparecer: toque nos 3 pontinhos (⋮) no canto do Chrome → "Instalar app" (ou "Adicionar à tela inicial")
4. Depois de instalado, abra o app pelo ícone e toque em "Permitir notificações"
Me avise quando terminar.
```

## Validação

- Build + typecheck passando.
- Após ele instalar e permitir, confirmo o registro do aparelho no banco e envio a notificação de teste da OS #1209.
