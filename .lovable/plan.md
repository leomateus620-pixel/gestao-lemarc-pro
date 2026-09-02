# Cadastro de unidades voltando a funcionar (Camera S.A e demais empresas)

## O que já foi verificado

- O Márcio (marciop.freddi@gmail.com) **é admin** no sistema — não é falta de permissão de perfil.
- As regras de acesso da tabela de unidades permitem que qualquer usuário autenticado crie unidades (desde que ele mesmo seja o criador) e que admins editem/excluam. Ou seja, criar unidade não está bloqueado por permissão.
- A CAMERA AGROINDUSTRIAL S.A tem **64 unidades e todas as 64 têm CNPJ preenchido**.
- Existe uma regra no banco que **proíbe duas unidades da mesma empresa com o mesmo CNPJ**. Como na prática filiais/plantas da Camera costumam compartilhar o CNPJ da matriz, é muito provável que a tentativa do Márcio caia exatamente nessa regra.
- Na tela de detalhe da empresa, as ações de unidade (adicionar, editar, ativar/desativar, excluir) **não têm tratamento de erro em várias delas** — quando o servidor recusa, nada aparece na tela. Isso explica a sensação de "clico e não acontece nada / erro invisível".

A causa exata do caso do Márcio ainda não está confirmada (não temos a mensagem de erro dele). Por isso o primeiro passo do plano é reproduzir o cadastro logado como admin e capturar o erro real; as correções abaixo cobrem as duas frentes encontradas.

## O que será feito

1. **Reproduzir o cadastro** de uma nova unidade na Camera S.A e em outra empresa, logado como admin, e registrar a mensagem de erro real.
2. **Nunca mais erro invisível**: toda ação de unidade (adicionar, editar, ativar/desativar, excluir) passa a mostrar a mensagem de erro na própria tela e em aviso, com texto claro em português.
3. **Permitir unidades com o mesmo CNPJ na mesma empresa** (caso comum: matriz e filiais operacionais com o mesmo CNPJ). O CNPJ continua sendo validado quanto ao formato/dígito, mas deixa de bloquear o cadastro: em vez de erro, a tela avisa que já existe outra unidade com aquele CNPJ e o cadastro segue.
4. **CNPJ deixa de ser obstáculo**: campo continua opcional, e um CNPJ inválido segue sinalizado no formulário antes de salvar.
5. **Validar o fluxo ponta a ponta**: criar unidade na Camera S.A e em pelo menos duas outras empresas, editar e reativar, confirmando que a lista, o vínculo com OS e o filtro de unidades no Nova OS continuam corretos.

Nenhuma unidade ou OS existente é alterada.

## Detalhes técnicos

- Migração: remover o índice único `client_units_client_cnpj_unique` (mantendo o índice de busca por `client_id`). Sem isso, a validação em `ensureUnitCnpjUnique` continuaria batendo em erro no banco.
- `src/lib/api/clients.functions.ts`: `createClientUnit`/`updateClientUnit` deixam de chamar `ensureUnitCnpjUnique` como bloqueio; passam a retornar `duplicateCnpj: boolean` junto da unidade para a UI avisar. `normalizeUnitFields` mantém a validação de dígitos do CNPJ.
- `src/routes/_app.clientes.$id.index.tsx` (`UnitsSection`): adicionar `onError` com `toast.error` em `addMut`, `editMut`, `toggleActive` e `removeMut`, e exibir `errorMessage` também na edição; avisar quando `duplicateCnpj` vier verdadeiro.
- `src/components/clientes/ClientUnitsEditor.tsx`: mesmo tratamento de erro/aviso nas mutações de unidade, mantendo o visual atual.
- Verificação final via teste no app rodando (login admin) com captura de tela e checagem das linhas criadas.
