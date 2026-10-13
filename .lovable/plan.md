# Técnicos voltam a entrar com e-mail e senha

## Comportamento final
- Técnico que entra com **e-mail e senha** entra normalmente, mesmo que um dia tenha tocado em "Entrar com Google" e a conta tenha ficado com o Google vinculado. Isso atinge hoje Douglas, Juan Rusch, Uilian e Vinicius.
- Quem entra **pelo Google** continua passando pela checagem de administrador:
  - Admin entra.
  - Técnico é desconectado só neste aparelho, com a mensagem "Acesso pelo Google é restrito a administradores".
- O que decide se o login foi pelo Google é **como foi feita a entrada desta vez**, e não se a conta tem o Google vinculado.
- Os tempos limite, a regra dos 30 dias e a saída só no aparelho atual (`scope: 'local'`) não mudam. Banco, identidades vinculadas, papéis e dados também não mudam.

## Regra (função única)
Nova função `isGoogleSession(session)` em `src/lib/auth/sessionPolicy.ts`. Ela reaproveita `decodeJwtPayload`.
1. Lê os métodos de entrada (`amr`) do token da sessão e pega o mais recente entre `password`, `oauth`, `otp`, `magiclink` e `sso/saml`. O `token_refresh` é ignorado.
   - Se o mais recente for `oauth`, a sessão conta como **Google**.
   - Se for qualquer outro, **não é Google**.
2. Se o token não trouxer `amr`, a função olha um aviso guardado na aba (`sessionStorage`): `lemarc:auth-google-pending`. Ele só é gravado quando a pessoa toca em "Entrar com Google" (`handleGoogle`).
   - Com o aviso, a sessão conta como Google.
   - Sem o aviso, **não bloqueia**.
3. `app_metadata.provider` e `app_metadata.providers` deixam de ser usados nessa decisão.
4. O aviso é apagado depois que a checagem termina e também em qualquer login com senha.

## Arquivos
- `src/lib/auth/sessionPolicy.ts`: `isGoogleSession`, `markGooglePending` e `clearGooglePending`.
- `src/lib/auth/sessionPolicy.test.ts`, com estes casos:
  - Senha, com a conta tendo e-mail e Google vinculados: não é Google.
  - `oauth`: é Google.
  - `password` antigo seguido de `oauth` mais recente: é Google.
  - `oauth` antigo seguido de `password` mais recente: não é Google.
  - Sem `amr` e sem aviso: não é Google.
  - Sem `amr` e com o aviso: é Google.
- `src/routes/login.tsx`:
  - `ensureGoogleAdminOrSignOut` passa a receber a sessão e usa `isGoogleSession`.
  - `finishAuthentication` recebe a sessão inteira, nos três pontos que já a têm.
  - `handleGoogle` marca o aviso.
  - O login com senha limpa o aviso.
- `src/components/app/AuthContext.tsx`: `enforceGoogleAdmin` usa `isGoogleSession(s)`.
- A decisão "é admin?" para o Google continua igual: consulta `user_roles` com `role = 'admin'`. Em erro na consulta, continua bloqueando, como hoje.
  - Para separar admin de técnico, essa parte vai para um helper puro e testável, `shouldBlockGoogleLogin(isGoogle, isAdmin)`. Os testes cobrem: admin pelo Google é permitido; técnico pelo Google é bloqueado; qualquer um com senha é permitido.

## Riscos
- Uma sessão do Google criada antes dessa mudança e sem `amr` no token não seria bloqueada. É improvável, porque o servidor sempre envia `amr`. Ainda assim, o acesso aos dados continua protegido no servidor pelos papéis e pela RLS.
- Se o técnico tocar em "Entrar com Google" e, na mesma aba, depois entrar com senha, o aviso é limpo no login com senha. Não há bloqueio indevido.

## Perguntas em aberto
1. Quer que eu deixe os técnicos afetados (Douglas, Juan, Uilian e Vinicius) com o Google vinculado como está? O plano não mexe nisso, e com a correção não faz diferença.
