# Login que não trava no celular (sessão antiga, rede lenta)

## Resumo
O login e a abertura do app passam a ter tempo limite. Se a sessão antiga guardada no aparelho estiver ruim, o app a limpa só naquele aparelho e deixa entrar de novo. "Sair" passa a desconectar só o aparelho atual. Banco, papéis, permissões, senhas, OS e horas não mudam.

## Comportamento final
- **Entrar com e-mail e senha:** se não houver resposta em 15 s, aparece "A conexão demorou demais. Verifique a internet e tente de novo." e o botão volta a funcionar. Senha errada continua mostrando "E-mail ou senha inválidos." na hora.
- **Abrir /login com sessão antiga no aparelho:** o app tenta ler a sessão por até 8 s. Se der erro ou passar do tempo, apaga a sessão local deste aparelho (somente a chave `sb-*-auth-token`, sem chamar o servidor) e mostra o formulário normal.
- **Depois de 10 s carregando** (no login ou na abertura do app): aparece o botão "Limpar sessão e tentar de novo". Ele apaga só a sessão deste aparelho e recarrega a página.
- **Abertura do app (tela de carregamento antes do Início):** se a leitura da sessão não terminar em 15 s, a tela mostra "Não foi possível carregar sua sessão", com os botões "Voltar ao login" e "Limpar sessão e tentar de novo". Antes disso, o carregamento seria infinito.
- **Sair:** desconecta somente o aparelho atual. Um técnico que sai pelo celular continua logado no tablet ou no computador.
- **Google-admin:** continua bloqueando quem não é admin. A única mudança é que o bloqueio desconecta só aquele aparelho.

## Arquivos a alterar
- `src/lib/auth/withTimeout.ts` (novo): `withTimeout(promise, ms, label)` lança um `AuthTimeoutError`. Também traz `clearLocalAuthSession()`, que remove as chaves `sb-*-auth-token` de localStorage e sessionStorage, e `logAuthIssue(stage, info)`.
- `src/lib/auth/withTimeout.test.ts` (novo): testes de resolução, timeout, erro propagado e limpeza do timer.
- `src/routes/login.tsx`:
  - Tempo limite em `signInWithPassword` (15 s), na leitura inicial da sessão (8 s), em `getMyModuleAccess` (15 s) e em `handleContinueSession`.
  - Guarda com `useRef` para `finishAuthentication` rodar só uma vez por usuário. Ela só é liberada de novo em caso de erro ou "Trocar conta".
  - O callback de `onAuthStateChange` passa a ser síncrono e adia o trabalho com `setTimeout(0)`.
  - Limpeza automática da sessão local quando a leitura falha ou passa do tempo.
  - Botão de limpar após 10 s.
  - `signOut({ scope: "local" })` em `handleSwitchAccount` e em `ensureGoogleAdminOrSignOut`.
- `src/components/app/AuthContext.tsx`:
  - Tempo limite em `getSession` (15 s). Se passar do tempo, `loading` termina com `timedOut=true` (novo campo no contexto) e a sessão local é limpa.
  - O callback de `onAuthStateChange` só faz `setSession`. A checagem Google-admin é adiada com `setTimeout(0)`.
  - `signOut()` passa a usar `scope: "local"`. Isso cobre AppShell, `_app.mais`, LeitosShell e WireTrayAccessContext, porque todos usam `useAuth().signOut`.
- `src/routes/_app.tsx` (AuthGate): mostra os botões após 10 s de espera e a tela de erro quando `timedOut` vem verdadeiro.
- `src/routes/leitos.tsx` (gate de Leitos): recebe o mesmo tratamento, porque usa o mesmo AuthContext. Só muda a tela de espera.
- Registro de erros: `console.warn` com estágio (`getSession`, `signIn`, `moduleAccess`), duração e código do erro, sem senha, sem token e sem e-mail completo. Usa também o relatório de erros que o projeto já tem (`lovable-error-reporting`), se aceitar eventos manuais. Não cria tabela nova.

## Testes
- Unitários:
  - `withTimeout`.
  - Guarda de `finishAuthentication`: um helper puro, `createOnceGuard`, chamado duas vezes dispara uma vez e pode ser liberado de novo.
  - `clearLocalAuthSession` remove só as chaves `sb-*-auth-token`.
- Suíte completa e checagem de tipos.
- Navegador local: login normal; Supabase bloqueado por rota simulada (o erro deve aparecer em cerca de 15 s); sessão corrompida colocada em localStorage (deve limpar e mostrar o formulário).
- Roteiro manual no Android, no Chrome e no app instalado:
  - Login normal.
  - Modo avião durante o envio: o erro aparece em cerca de 15 s.
  - Sessão antiga inválida: o app limpa e deixa entrar.
  - Botão de limpar após 10 s.
  - Sair no celular não derruba o computador.

## Riscos
- Em rede muito lenta, 15 s pode cortar um login que daria certo. A mensagem pede para tentar de novo, e a nova tentativa funciona normalmente.
- Limpar a sessão local exige novo login naquele aparelho, o que é intencional.
- `scope: "local"` deixa a sessão válida no servidor até expirar, caso alguém só "saia" e o aparelho seja perdido. Para esses casos dá para encerrar as sessões pelo admin depois.
- A causa exata do travamento do Douglas não foi confirmada. A explicação é uma inferência. O plano cobre as hipóteses mais prováveis no aparelho, mas não prova qual foi.
- Um timeout não cancela a requisição em andamento. Se ela terminar depois, a guarda impede que o login seja finalizado em dobro.

## Perguntas em aberto
1. Tempos de 15 s para login e acesso e 8 s para ler a sessão ao abrir o /login: estão bons?
2. Quer manter uma opção "Sair de todos os aparelhos" (scope global) em Mais, só para admins? O plano não inclui essa opção.
3. Basta o registro no console e no relatório de erros já existente, sem tabela nova?
