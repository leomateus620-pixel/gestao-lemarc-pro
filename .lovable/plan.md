## Objetivo

Substituir o login mockado atual por um login real usando **Lovable Cloud** com **Sign in with Google** (gerenciado), persistindo os usuários e sessões automaticamente.

## O que será feito

### 1. Ativar Lovable Cloud
- Provisiona banco, autenticação e armazenamento, sem o usuário precisar criar contas externas.
- Habilita o provider **Google** gerenciado (sem necessidade de configurar OAuth no Google Console).

### 2. Tabela de perfis (`profiles`)
Para guardar dados do usuário vindos do Google (nome, email, avatar) e permitir associar papéis (gestor/colaborador) no futuro:

- `profiles` ligada a `auth.users` (FK com `ON DELETE CASCADE`)
- Campos: `id`, `user_id`, `full_name`, `avatar_url`, `email`, `created_at`
- RLS: cada usuário lê/atualiza apenas o próprio perfil
- Trigger `handle_new_user` cria o perfil automaticamente ao primeiro login
- GRANTs corretos para `authenticated` e `service_role`

> Papéis (gestor/colaborador) continuarão mockados via `RoleContext` nesta fase — a tabela `user_roles` segura fica para um próximo passo, quando ligarmos o sistema de permissões real.

### 3. Tela de Login (`/login`)
Reescrita mantendo a estética industrial atual (navy + laranja, glass, Archivo/Inter, logo Lemarc):

- Botão grande **"Entrar com Google"** com ícone oficial
- Texto curto explicando o acesso restrito a colaboradores Lemarc
- Loading state durante o redirect OAuth
- Mensagem de erro elegante em caso de falha
- Remove o formulário fake de email/senha (não havia lógica real)

Fluxo:
```
[Login] → lovable.auth.signInWithOAuth('google') → Google → callback → /dashboard
```

### 4. Sessão e proteção de rotas
- `onAuthStateChange` configurado uma única vez em `__root.tsx` (SIGNED_IN / SIGNED_OUT / USER_UPDATED)
- Mover as rotas autenticadas (`dashboard`, `ordens`, `clientes`, `colaboradores`, `relatorios`) para o layout gerenciado `src/routes/_authenticated/` (gate `ssr:false` que redireciona para `/login` quando não há sessão)
- `/login` permanece rota pública
- `index.tsx` redireciona para `/dashboard` (que por sua vez redireciona para `/login` se deslogado)

### 5. Header / AppShell
- Mostrar **avatar + nome reais** do Google no header (vindos de `profiles` ou `user.user_metadata`)
- Botão **Sair** chama `supabase.auth.signOut()` com limpeza correta (cancel queries → clear cache → signOut → navigate replace)

## Detalhes técnicos

- Cliente browser: `@/integrations/supabase/client`
- Provider Google ativado via `supabase--configure_social_auth` no mesmo turno
- Chamada OAuth usa o broker da Lovable: `lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin })` — **não** chamar `supabase.auth.signInWithOAuth` direto para Google
- Migration única com: `create table profiles`, GRANTs, `enable RLS`, policies (`select/update` usando `auth.uid() = user_id`), function `handle_new_user` (SECURITY DEFINER), trigger `on_auth_user_created`

## Fora do escopo desta etapa

- Login por email/senha (pode ser adicionado depois se quiser)
- Sistema real de papéis (gestor vs colaborador) com tabela `user_roles` e RLS por papel
- Convite/aprovação de novos usuários (qualquer Google logado entra — adicionamos allowlist depois se necessário)
- Persistência real das ordens de serviço (continua mock)

## Resultado

Ao final, qualquer pessoa abre `/login`, clica em **Entrar com Google**, autentica, e cai no dashboard com nome e foto reais — a sessão fica salva e protege as rotas internas automaticamente.
