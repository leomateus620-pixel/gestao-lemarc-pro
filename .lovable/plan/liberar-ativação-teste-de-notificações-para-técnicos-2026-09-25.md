# Liberar ativação/teste de notificações para técnicos

## Causa
- As telas **Mais** (`src/routes/_app.mais.tsx`) e **Configurações** (`src/routes/_app.configuracoes.tsx`) são envolvidas por `RequireAdmin`, então técnicos não veem a área **Notificações** (ativar / instalar app / enviar teste).
- A função de teste `sendTestPush` (`src/lib/api/push.functions.ts`) já é segura para qualquer usuário logado: envia apenas para os aparelhos da própria pessoa. Nenhuma mudança de servidor necessária.

## Correção proposta
1. **`src/routes/_app.mais.tsx`** — remover o `RequireAdmin` da rota e adaptar o conteúdo por perfil:
   - Técnicos veem: cartão da conta (nome, e-mail, "Encerrar sessão") + a área **Notificações** (ativar, instalar app, enviar notificação de teste).
   - Admins continuam vendo tudo o que já veem hoje (atalhos Colaboradores/Relatórios/Configurações, seletor de visualização, etc.).
   - Implementação: ler o papel do usuário (`useRole`/`useAuth`) e renderizar os blocos de admin só quando admin; o resto fica igual, sem redesign.
2. **`src/routes/_app.configuracoes.tsx`** — permanece só para admins (valor por km e registro de envios continuam restritos).
3. Nada muda no servidor, nas regras de banco ou em quem recebe cada notificação.

## Validação
- Entrar como técnico (ex.: Juan Rusch): abrir **Mais** → área Notificações visível → "Ativar notificações" → "Enviar notificação de teste" chega no próprio aparelho.
- Entrar como admin: tela Mais igual a hoje, Configurações intactas.
- Build + typecheck sem erros.

## Riscos de regressão
- Baixos: apenas condicional de exibição na tela Mais. Nenhum dado sensível de admin é exposto ao técnico (atalhos e configurações continuam escondidos e protegidos no servidor).
