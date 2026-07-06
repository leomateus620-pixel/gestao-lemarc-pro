## Passo 2 do Wizard (Cliente) para técnico + campo CNPJ ao cadastrar

### Diagnóstico
1. **Técnico não vê clientes**: as policies SELECT de `clients` e `client_units` restringem a `admin OR created_by = auth.uid()`. Como o técnico não criou clientes, a lista aparece vazia ("Nenhum cliente encontrado").
2. **Sem CNPJ no cadastro rápido**: a aba "Cadastrar novo" chama `createClient` (serviceOrders.functions.ts) que só grava `name` e `unit`. Não pede/persiste CNPJ.

### Correções

**1) RLS (migração)** — permitir leitura por qualquer usuário autenticado:
- `clients` SELECT: substituir `admin OR owner` por `TO authenticated USING (true)`.
- `client_units` SELECT: mesmo tratamento.
- UPDATE/DELETE continuam restritos a `admin OR created_by` (técnico enxerga, não edita).
- INSERT continua livre para autenticados (com `created_by = auth.uid()`), permitindo o cadastro rápido pela OS.

**2) Wizard `ClientStep` (`src/components/ordens/ServiceOrderWizard.tsx`)**
- Adicionar campo **CNPJ** (opcional) na aba "Cadastrar novo", com máscara `maskCNPJ` e validação `isValidCNPJ` (helpers já existentes em `@/lib/cnpj`).
- Trocar a chamada de `createClient` (serviceOrders.functions.ts) por `createCompany` (clients.functions.ts) — este já persiste `cnpj`, valida e checa duplicidade.
- Ajustar `onSuccess` para usar o `row.id` retornado por `createCompany` (mesma assinatura de retorno com `id, name, unit, cnpj`).
- Mensagem de erro em pt-BR usando `sonner` toast ("CNPJ inválido.", "Já existe um cliente com este CNPJ.").
- Se técnico: manter aba "Cadastrar novo" habilitada (sem restrição), mas cartões de cliente na aba "Selecionar existente" continuam **somente-leitura** (o wizard já não expõe edição — apenas selecionar).

### Fora do escopo
- Não mexer no `/clientes` (admin-only continua).
- Não alterar unidades no cadastro rápido — permanece só nome + CNPJ (unidade opcional, campo já existe).
- Sem mudanças em outras rotas ou permissões.

### Validação
- `bunx tsgo` sem erros.
- Login como Marcio → wizard etapa 2 lista todos os clientes; aba "Cadastrar novo" grava com CNPJ e seleciona o cliente criado.
- Login admin → nada regride; edição no menu Clientes continua funcionando.
