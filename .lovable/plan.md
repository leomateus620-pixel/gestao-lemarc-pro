# Manter conectado por 30 dias

## Resumo
Depois de entrar com e-mail e senha ou com Google, o aparelho fica conectado por até 30 dias sem pedir a senha, mesmo com o app fechado ou sem rede ao abrir. A sessão só é apagada neste aparelho em quatro casos:
- o servidor recusa a sessão de forma definitiva;
- passam os 30 dias;
- a pessoa toca em "Sair";
- a pessoa toca em "Limpar sessão e tentar de novo".

Nada muda no banco, nos papéis, nas permissões ou nos dados.

## Comportamento final
- **Abrir o app no dia seguinte:** abre direto no módulo escolhido. O app instalado já abre em `/dashboard`. No navegador, o endereço `/` passa a levar ao módulo salvo quando já existe sessão, sem mostrar o formulário. O token é renovado sozinho.
- **Modo avião ou rede ruim ao abrir:** a sessão salva continua. Se o app não conseguir confirmar a sessão a tempo, aparece "Sem conexão. Tentando de novo…" com o botão "Tentar de novo". A sessão não é apagada. O botão "Limpar sessão e tentar de novo" continua disponível, mas só age quando a pessoa toca nele.
- **Voltar para o app** (foco ou aba visível): a renovação automática volta a rodar e a sessão é conferida. Em segundo plano, a renovação para, para poupar bateria e não ficar travada.
- **30 dias depois do último login com senha ou Google:** o app sai só neste aparelho e mostra no /login "Por segurança, entre novamente." Cada login novo recomeça a contagem de 30 dias.
- **Sessão recusada pelo servidor** (token inválido, revogado ou não encontrado, ou erro 400/401 do login): o app limpa a sessão deste aparelho e mostra "Sua sessão expirou. Entre novamente."
- **Sair:** continua desconectando só este aparelho. Não há opção de sair de todos.
- **Proteção do armazenamento no Android:** depois do login, o app pede ao navegador para guardar os dados de forma persistente (`navigator.storage.persist()`), quando o aparelho suporta. A pessoa não vê nada.

## Regra dos 30 dias (sem banco)
- A data do último login vem do próprio token de acesso: o campo `amr` traz os métodos de login (senha ou Google) com o horário de cada um.
- A regra usa o horário de login mais recente que aparece nesse campo.
- Se o token não trouxer esse campo, usa um registro salvo no aparelho na hora do login: `lemarc:auth-login-at:<userId>`.
- Tudo é calculado no aparelho. Não precisa de tabela nova.
- Se a pessoa adiantar o relógio, pode ser desconectada antes; atrasar o relógio não estende o prazo além do que o servidor já permite. É um limite de conveniência. A segurança de verdade continua no servidor: a RLS valida cada chamada.

## Configurações de login no servidor
- **Vigente hoje (confirmado):** sessões sem limite máximo e renovação com troca de token funcionando. Isso já basta para os 30 dias.
- **Tempo de cada token de acesso:** manter o padrão de 1 hora. Não precisa mudar.
- **Troca de token e intervalo de reuso:** manter os padrões, troca ativa e cerca de 10 s. Esse intervalo também ajuda quando duas abas renovam ao mesmo tempo.
- **Limite máximo e limite por inatividade no servidor:** a ferramenta de configuração de login disponível no Lovable Cloud não oferece esses ajustes. Por isso, os 30 dias ficam só no aparelho.
  - Se um dia for necessário forçar o limite também no servidor, a opção seria uma tarefa agendada no banco que encerra sessões com mais de 30 dias. Isso seria aditivo, mas não faz parte deste plano.

## Arquivos
- `src/lib/auth/sessionPolicy.ts` (novo):
  - `classifyAuthError(error)` separa os erros em `definitive` e `transient`:
    - `definitive`: `refresh_token_not_found`, `invalid_refresh_token`, `refresh_token_already_used` fora do intervalo de reuso, `session_not_found`, `bad_jwt`, status 400/401/403 do login.
    - `transient`: tempo esgotado, falha de rede, `AuthRetryableFetchError`, status 5xx ou 0.
  - `getLastLoginAt(session)`: lê o campo `amr` do token e, se faltar, o registro salvo no aparelho.
  - `isSessionTooOld(session, now)`: aplica a regra dos 30 dias.
  - `markLogin(userId)`, `requestPersistentStorage()` e `startVisibilityAutoRefresh()`.
- `src/lib/auth/sessionPolicy.test.ts` (novo): testes da regra dos 30 dias (29d23h, 30d, sem `amr`, `amr` com vários métodos) e da classificação de erros. Também verifica que tempo esgotado e falta de rede não limpam a sessão.
- `src/lib/auth/withTimeout.ts`: só ajuste no registro de erros, para incluir a classificação.
- `src/components/app/AuthContext.tsx`:
  - Em tempo esgotado ou erro passageiro, a sessão salva fica e o estado vira `offline`.
  - Erro definitivo ou mais de 30 dias: sai só deste aparelho, com o motivo.
  - Liga a renovação por visibilidade.
  - Confere a sessão ao voltar o foco, com `getUser` sob tempo limite.
  - Erros de `TOKEN_REFRESHED` ou `SIGNED_OUT` vindos do servidor são tratados pela classificação.
- `src/components/app/SessionWaitScreen.tsx`: novo estado `offline`, com o aviso e o botão "Tentar de novo". "Limpar sessão" continua sendo uma escolha da pessoa.
- `src/routes/_app.tsx` e `src/routes/leitos.tsx`: tratam `offline` sem mandar para o /login.
- `src/routes/login.tsx`:
  - A leitura inicial lenta deixa de limpar a sessão; mostra aviso e "Tentar de novo".
  - Só limpa em erro definitivo ou nos 30 dias.
  - Depois de um login bem-sucedido, chama `markLogin` e `requestPersistentStorage`.
  - Mostra o motivo da saída ("Por segurança, entre novamente." ou "Sua sessão expirou.").
- `src/routes/index.tsx`: hoje redireciona sempre para /login. Passa a levar ao módulo salvo quando há sessão no aparelho, e ao /login quando não há.
- `AGENTS.md`: substituir a regra atual por uma que inclua "nunca limpar a sessão em erro passageiro".

## Armazenamento
O armazenamento local do navegador, protegido com o pedido de armazenamento persistente, é suficiente. A sessão é pequena e leve, e o login atual já depende dele. Trocar para IndexedDB exigiria um adaptador próprio e não protege mais: o Android apaga os dois juntos. Fica para depois, caso apareçam casos reais de perda.

## Testes
- Unitários: os listados acima, a suíte completa e a checagem de tipos.
- Navegador local:
  - Bloquear a rede do login ao abrir (a sessão deve continuar e aparecer o aviso).
  - Simular token recusado (deve limpar e mostrar a mensagem).
  - Adiantar a data salva do login em 31 dias (deve pedir login).
- Roteiro manual no Android, no Chrome e no app instalado:
  - Entrar, fechar o app e reabrir no dia seguinte, sem pedir senha.
  - Abrir em modo avião: não desconecta.
  - Simular 30 dias: pede login de novo.
  - Sair num aparelho não derruba o outro.

## Riscos
- Os 30 dias são contados pelo relógio do aparelho. Um relógio errado pode adiantar o pedido de login.
- Uma sessão revogada no servidor, com o aparelho offline por muito tempo, só será detectada quando a rede voltar. Até lá a tela pode mostrar dados antigos em cache, mas o servidor recusa qualquer gravação.
- Se o Android limpar os dados do site mesmo com o armazenamento persistente (por exemplo, quando a pessoa apaga os dados), vai pedir login de novo. Isso é inevitável.
- Duas abas renovando ao mesmo tempo podem gerar um aviso de token já usado. O intervalo de reuso cobre esse caso, e ele não é tratado como definitivo dentro da janela de reuso.

## Perguntas em aberto
1. Os 30 dias contam a partir do último login com senha ou Google (como no plano), ou do último uso, que funcionaria como inatividade?
2. Quer o mesmo limite para técnicos e para admins, ou um prazo menor para admins (por exemplo, 7 dias)?
3. Quer que, perto do vencimento (por exemplo, no dia 28), o app avise "Sua sessão vence em 2 dias"?
