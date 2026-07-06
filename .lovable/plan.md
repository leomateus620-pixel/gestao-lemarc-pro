## Adicionar login por e-mail e senha na tela /login

Manter o botão "Entrar com Google" e adicionar, no mesmo card, um formulário dedicado com e-mail + senha para os técnicos que não usam Google.

### UI (dentro do `GlassLoginCard` em `src/routes/login.tsx`)
- Campos: **E-mail** (input `type="email"`, autoComplete `username`) e **Senha** (input `type="password"` com botão mostrar/ocultar, autoComplete `current-password`).
- Botão primário laranja **"Entrar"** (loading `Loader2`).
- Divisor "ou" separando o formulário do botão Google (Google permanece como opção secundária).
- Mensagem de erro contextual reaproveitando o bloco `AlertCircle` existente (pt-BR: "E-mail ou senha inválidos.", "Informe e-mail e senha.", etc.).
- Estilo consistente com o tema atual (bg `white/[0.04]`, borda `white/10`, foco laranja) — sem componentes novos, apenas Tailwind + shadcn `Input`/`Label` já disponíveis.

### Lógica
- Handler `handleEmailPassword(e)`:
  - Valida campos não-vazios e formato de e-mail (regex simples).
  - Chama `supabase.auth.signInWithPassword({ email, password })`.
  - Em sucesso, o listener `onAuthStateChange` já redireciona para `/dashboard`.
  - Em erro: mapeia `Invalid login credentials` → "E-mail ou senha inválidos." e demais para mensagem genérica.
- Um único estado `isSubmitting` bloqueia ambos os fluxos (Google e e-mail/senha) enquanto uma tentativa está em andamento.

### Fora do escopo
- Não implementar cadastro público, recuperação de senha, nem alterar políticas de auth do Supabase.
- Não alterar RLS, rotas protegidas, ou o fluxo do técnico já implementado.

### Validação
- `bunx tsgo` para tipos.
- Teste manual com o usuário Marcio (`lemarcmanutencao@gmail.com` / `5656`) já cadastrado → deve entrar e cair no dashboard do técnico.
