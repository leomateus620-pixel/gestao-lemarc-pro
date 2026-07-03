## Diagnóstico

Ao clicar em "Editar" na tela do cliente, a URL muda para `/clientes/{id}/editar` e o título da aba vira "Editar cliente" — ou seja, a rota carrega. Mas o conteúdo que aparece continua sendo o **detalhe** do cliente, sem nenhum campo editável.

Causa raiz: no roteador (TanStack Router), quando existe o arquivo `_app.clientes.$id.editar.tsx`, o arquivo pai `_app.clientes.$id.tsx` deixa de ser apenas uma página e passa a atuar como **layout pai** de `/editar`. Para o filho aparecer, o pai precisaria renderizar um `<Outlet />` — mas ele renderiza direto o componente `<Detail />` (a tela de detalhe). Resultado: a rota `/editar` casa, executa `head()` (por isso o título muda), mas o componente da tela de edição nunca é montado.

## Correção

Transformar `/clientes/$id` em uma rota folha "irmã" de `/clientes/$id/editar`, eliminando a hierarquia pai/filho indevida:

1. Renomear `src/routes/_app.clientes.$id.tsx` → `src/routes/_app.clientes.$id.index.tsx`.
2. Ajustar dentro do arquivo o `createFileRoute("/_app/clientes/$id")` para `createFileRoute("/_app/clientes/$id/")` (formato de rota index exigido pelo TanStack).
3. Nenhuma outra mudança: os `<Link to="/clientes/$id">` e `<Link to="/clientes/$id/editar">` existentes continuam funcionando sem edição, pois o path público não muda.

## Validação

- Abrir um cliente → tela de detalhe continua idêntica.
- Clicar em "Editar" → agora carrega a tela de edição com todos os campos (nome, CNPJ, segmento, cidade/UF, endereço, telefone, e-mail, responsável, observações, ativo) e a seção "Unidades" com CRUD.
- Salvar alterações → toast de sucesso, cache invalidado, volta para o detalhe atualizado.
- Verificar no preview que a URL `/clientes/{id}/editar` renderiza o formulário e não mais o detalhe.

## Escopo

Alteração cirúrgica só em `clientes`. Não mexer nas rotas de `colaboradores` / `ordens` neste turno, mesmo que tenham estrutura parecida — o usuário pediu apenas a correção do fluxo de editar cliente.
