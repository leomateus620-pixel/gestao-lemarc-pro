## Problema

No passo "Técnico" do wizard de nova OS, o técnico logado vê "Nenhum técnico encontrado". Motivo: as políticas SELECT da tabela `technicians` restringem leitura a admin, dono do registro ou ao próprio técnico (`user_id = auth.uid()`), então um técnico não enxerga os colegas cadastrados.

## Correção

Migration na tabela `public.technicians`:

- Remover as políticas SELECT atuais:
  - `View technicians`
  - `View technicians (admin or owner)`
- Criar uma nova política SELECT que permite qualquer usuário autenticado ler a lista de técnicos (necessário para atribuir técnicos em uma OS):

  ```sql
  CREATE POLICY "View technicians (authenticated)"
  ON public.technicians FOR SELECT
  TO authenticated
  USING (true);
  ```

- INSERT/UPDATE/DELETE permanecem inalteradas (admin ou dono do registro). Não há mudança em `clients`, `client_units` nem em qualquer código de UI.

## Resultado esperado

- Técnico logado abre nova OS → passo 3 lista todos os técnicos cadastrados e pode selecionar.
- Continua sem poder editar/excluir cadastros (o menu `/colaboradores` segue restrito a admin).
- Admin continua enxergando tudo como antes.

## Validação

- Login Marcio → nova OS → passo Técnico mostra a lista completa.
- Login admin → nenhum comportamento alterado.
