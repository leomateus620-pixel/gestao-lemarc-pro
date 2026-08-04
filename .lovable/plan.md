# Cadastrar empresa direto na etapa "Cliente" do Novo pedido

## O que muda

Na seção **01 Cliente** da tela "Novo pedido" (Leitos Aramados), ao lado do rótulo "Cliente" entra um botão **+ Nova empresa**. Ele abre um formulário rápido em modal com:

- Nome da empresa (obrigatório)
- CNPJ (opcional, com validação já existente no sistema)
- Cidade / Estado
- Endereço
- Telefone
- Responsável

Ao salvar:
1. A empresa é criada no cadastro de clientes (o mesmo cadastro usado no módulo de Ordens de Serviço).
2. A lista do campo "Cliente" é recarregada.
3. A nova empresa fica **selecionada automaticamente** no campo "Cliente", e "Unidade do cliente" volta para "Sem unidade específica".
4. Mensagem de confirmação e o restante do pedido continua exatamente como está (rascunho não altera saldos).

Erros (nome curto, CNPJ inválido, CNPJ duplicado) aparecem dentro do modal, sem perder o que já foi preenchido no pedido.

## Detalhes técnicos

- Reutiliza `createCompany` de `src/lib/api/clients.functions.ts` (já valida CNPJ e duplicidade; a política de inserção em `clients` permite qualquer usuário autenticado criando com `created_by = self`, então não é preciso migração nem mudança de RLS).
- Novo componente `src/components/leitos/QuickClientDialog.tsx` (modal leve no padrão visual `wire-*` já usado na página).
- Em `src/components/leitos/pages/OrdersPage.tsx` (`WireTrayOrderWizardPage`): botão no cabeçalho do campo Cliente, estado de abertura do modal e, no sucesso, `queryClient.invalidateQueries({ queryKey: wireTrayKeys.orderOptions })` + `await refetch()` das opções antes de aplicar `setForm({ ...form, clientId: novoId, clientUnitId: null })`.
- Também invalida `["clients", "full"]` para manter a lista do módulo de Ordens em sincronia.
- Botão visível apenas para quem já pode criar pedidos (`canCreate`), coerente com o restante da tela.
