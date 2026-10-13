# Ordens de Serviço como operação padrão no login

## Comportamento
- Ao abrir `/login`, "Ordens de Serviço" já aparece selecionada para todos, sem precisar tocar.
- Se o usuário escolheu antes "Leitos Aramados" neste aparelho, essa escolha lembrada continua valendo.
- Links com `?module=` ou `redirect` para Leitos continuam abrindo em Leitos.
- O botão Entrar fica habilitado de imediato; a mensagem "escolha a operação" deixa de aparecer na prática.

## Arquivos
- `src/routes/login.tsx` (linha 131): `initialModule = search.module ?? moduleFromPath(search.redirect) ?? readPreferredModule() ?? "os"`.
- `src/lib/modules.ts`: sem mudança em `readPreferredModule` (a tela inicial `/` depende do retorno nulo para decidir o destino).
- `src/lib/modules.test.ts`: teste simples garantindo que sem preferência, parâmetro ou redirect o padrão é "os".

## Fora do escopo
Autenticação, timeouts, saída local, 30 dias, bloqueio Google, banco, papéis e acesso a Leitos Aramados não mudam. Padrão é só conveniência de apresentação; o acesso a Leitos continua validado no servidor.

## Riscos
Técnico que tentar Leitos continua sendo bloqueado como hoje. Nenhuma pergunta em aberto.
