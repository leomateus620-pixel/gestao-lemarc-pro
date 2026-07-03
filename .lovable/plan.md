## Problema identificado

A rota `/_app/clientes/$id/editar` já existe e edita os campos da empresa (nome, CNPJ, segmento, endereço, cidade/UF, telefone, e-mail, responsável, observações, ativo). Mas ela **não permite gerenciar as unidades/filiais** (adicionar, editar, remover, marcar principal, editar CNPJ da filial, distância, taxa de deslocamento etc.). Como o usuário vê o cliente com "0 UNIDADES" e sem CNPJ preenchido, ao clicar em "Editar" ele espera um menu completo para preencher tudo isso — inclusive as filiais — e hoje não encontra essa área.

Além disso, mensagens de erro da mutação hoje aparecem só como texto pequeno; sem toast, dá sensação de que "nada acontece".

## O que será feito

Transformar a tela de edição de cliente em um menu completo com duas seções, sem quebrar nenhum fluxo existente:

### 1. Dados da empresa (já existe — melhorar)
- Manter todos os campos atuais.
- Adicionar toasts de sucesso/erro no salvar (via `sonner`, já usado no projeto).
- Manter validação de CNPJ e nome mínimo.

### 2. Unidades / Filiais (novo bloco na mesma página)
Nova seção "Unidades" logo abaixo da empresa, com UI no mesmo padrão glass/dark do restante:

- Lista das unidades existentes, cada uma como card expansível com os campos:
  - Nome, marcar como principal (estrela)
  - CNPJ da filial (com máscara + validação)
  - Setor, cidade, UF, endereço
  - Responsável, telefone
  - Distância (km) da base
  - Tipo de deslocamento (km / fixo / nenhum) + valor (centavos → input em reais)
  - Observações de faturamento e observações gerais
  - Toggle ativo/inativo
  - Botão "Salvar unidade" (usa `updateClientUnit`)
  - Botão "Excluir unidade" com confirmação (usa `deleteClientUnit`)
- Botão "+ Adicionar unidade" que abre um formulário inline com os mesmos campos e salva via `createClientUnit`.
- Ao marcar uma unidade como principal, desmarcar as outras (chamada extra `updateClientUnit` nas afetadas).
- Toasts de sucesso/erro em cada ação; invalidar `["client", id]`, `["client-page", id]`, `["clients", ...]` e `["client-units", "all"]` após cada mutação para refletir na tela de detalhes/listagens.

### 3. Navegação e integrações (sem quebrar nada)
- O botão "Editar" no card de cliente (`ClientIslandRow`) e o botão "Editar" na página de detalhes (`_app.clientes.$id.tsx`) continuam apontando para a mesma rota `/clientes/$id/editar`.
- `AppShell` continua com `back` e `fullscreenForm` — nada muda no shell/menu.
- Wizard de novo cliente permanece inalterado.
- Server functions `createClientUnit`, `updateClientUnit`, `deleteClientUnit` já existem e já validam CNPJ único por cliente — reutilizar como está.

## Arquivos afetados

- **Editar** `src/routes/_app.clientes.$id.editar.tsx`
  - Passar `units` do `useClientDetailQuery` para o novo bloco.
  - Adicionar toasts no salvar da empresa.
- **Criar** `src/components/clientes/ClientUnitsEditor.tsx`
  - Componente que recebe `clientId` + `units` e renderiza a lista + form de nova unidade, encapsulando as mutações `createClientUnit`, `updateClientUnit`, `deleteClientUnit`.
- Nenhum outro arquivo é modificado. Nenhuma migração de banco é necessária (tabela `client_units` e políticas já existem).

## Resultado esperado

Ao clicar em "Editar" em qualquer cliente (lista ou detalhes), o usuário abre uma única tela onde consegue:
1. Alterar todos os dados da empresa (incluindo CNPJ).
2. Ver, editar, adicionar, remover e marcar como principal qualquer unidade/filial, com todos os campos operacionais (distância, taxa, tipo de deslocamento).
3. Receber feedback visual (toast) de cada operação e ver as mudanças refletidas na tela de detalhes ao voltar.
