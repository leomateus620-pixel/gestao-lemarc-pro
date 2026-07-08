# Restringir "Entrar com Google" a administradores

## Objetivo
O botão "Entrar com Google" deve autenticar somente e-mails que já possuem o papel `admin` no sistema. Qualquer outra conta Google (mesmo que consiga passar pelo consentimento do Google) deve ser deslogada imediatamente e ver uma mensagem clara. Login por e-mail + senha (usado pelos técnicos) continua funcionando normalmente.

## Administradores atuais (permitidos via Google)
- leomateus620@gmail.com
- eduardo.s.qt@gmail.com
- lemarcfino@gmail.com
- marciop.freddi@gmail.com

Técnicos (`lemarcmanutencao`, `floresdouglas321`, `jar-1983`) continuam usando e-mail e senha — sem alteração.

## Como será feito

### 1. Validação pós-Google no `src/routes/login.tsx`
Após `lovable.auth.signInWithOAuth("google", …)` retornar com sessão setada (fluxo popup do preview) OU quando o `onAuthStateChange` disparar `SIGNED_IN` com provider Google:

1. Consultar `public.user_roles` para o `user.id` atual.
2. Se **não** contiver `admin`:
   - Chamar `supabase.auth.signOut()` (limpa a sessão recém-criada).
   - Exibir mensagem: *"Acesso pelo Google é restrito a administradores. Técnicos devem entrar com e-mail e senha."*
   - **Não** navegar para `/dashboard`.
3. Se contiver `admin`: fluxo normal (redireciona para `/dashboard`).

O listener `onAuthStateChange` já existente na página será ajustado para:
- Só redirecionar em `SIGNED_IN` quando a validação de role passar.
- Cobrir o caso do fluxo full-page (redirect) em que o retorno da Google acontece via `SIGNED_IN` no mount da página.

### 2. Rejeição também em `AuthContext` (defesa em profundidade)
No `src/components/app/AuthContext.tsx`, no evento `SIGNED_IN`, se o provider for `google` e o usuário não tiver papel `admin`, executar `signOut()` automaticamente. Isso protege qualquer rota autenticada caso alguém contorne a validação da página de login (ex.: sessão restaurada).

Implementação simples: consulta única a `user_roles` logo após set da sessão; usa o `roleCache` do `useUserRole` para não repetir chamadas.

### 3. Sem mudanças de backend / RLS
- `user_roles` já tem SELECT para `authenticated` — a validação roda como o próprio usuário logado (RLS permite ler as próprias linhas).
- Não desabilitar provider Google no backend (técnicos-admin futuros precisam do fluxo Google).
- Fluxo de e-mail + senha permanece intocado.

## Fluxos preservados
- Login e-mail/senha dos técnicos: sem alteração.
- Logout: sem alteração.
- Rotas protegidas `_authenticated/*`: sem alteração.
- Papéis existentes e RLS de outras tabelas: sem alteração.

## Detalhes técnicos
Arquivos a editar:
- `src/routes/login.tsx` — validação após Google + mensagem de bloqueio.
- `src/components/app/AuthContext.tsx` — verificação de segurança no `onAuthStateChange`.

Nenhuma migration, nenhuma alteração em `serviceOrders`, nenhum ajuste em componentes de OS/Dashboard.
