# Reconciliação do schema Leitos Aramados

## Objetivo
Restaurar a cadeia operacional completa do módulo Leitos Aramados no backend `lvsljgctwwovxcswtfwu`, sem quebrar o fluxo de login já corrigido nem afetar dados existentes.

## Estado verificado
- Projeto Supabase ativo: `lvsljgctwwovxcswtfwu` ✅
- `public.user_module_access` já existe (com admins mapeados)
- 0 tabelas `wire_tray_*` presentes — schema está limpo, seguro para aplicação sequencial
- 4 arquivos-fonte originais presentes em `supabase/migrations/`

## Passos

### 1. Aplicar 4 migrations sequenciais via `supabase--migration`
Cada chamada é uma migration separada, atômica, aditiva. Como o banco está limpo de objetos `wire_tray_*`, não há conflito.

1. **Foundation** (`20260721133000`): enums (`app_module`, `wire_tray_module_role`, categorias, status, etc.), 16 tabelas operacionais (`wire_tray_stock_locations`, `wire_tray_products`, `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_reservations`, `wire_tray_production_orders`, `wire_tray_documents`, `wire_tray_stock_movements`, `wire_tray_audit_events`, financials, etc.), índices e constraints
2. **Security** (`20260721133100`): `ENABLE ROW LEVEL SECURITY` + policies por role em cada tabela, GRANTs para `authenticated`/`service_role`, funções `has_wire_tray_role`/`wire_tray_can_view_financials`
3. **Commands** (`20260721133200`): RPCs de comando (criar pedido, reservar estoque, iniciar produção, registrar separação, etc.) — tudo `SECURITY DEFINER` com validação de role
4. **Fulfillment** (`20260721133300`): views (`wire_tray_inventory_catalog`, etc.), RPCs de listagem, storage buckets `wire-tray-documents` com policies

### 2. Recarga do PostgREST
Cada migration já contém `NOTIFY pgrst, 'reload schema'` no final. Após a última, confirmar via `supabase--read_query` que nenhuma tabela retorna `PGRST205`.

### 3. Validação automatizada
```
node scripts/validate-wire-tray-reconciliation.mjs
```
Confirma que todas as 16 tabelas, views, RPCs e buckets estão presentes.

### 4. Regeneração de tipos TypeScript
```
node scripts/sync-wire-tray-supabase-types.mjs
```
Atualiza `src/integrations/supabase/types.ts` para refletir o schema real.

### 5. Verificação funcional
- Rodar `bunx tsgo` para confirmar que tipos batem com o código
- Rodar `bunx vitest run` (suíte `useWireTray`, `schema-contract`, `errors`)
- Verificar via `supabase--read_query` que:
  - `user_module_access` mantém os admins existentes
  - `getMyModuleAccess` retorna dados esperados para um admin
- Instruir o usuário a fazer login real e validar acesso a `/leitos` e ao módulo OS

## Garantias
- **Transacional**: cada migration é uma transação Supabase; falha reverte tudo
- **Aditiva**: apenas `CREATE`, sem `DROP TABLE`, sem `TRUNCATE`, sem `DELETE`
- **Sem impacto em OS**: nenhuma tabela do módulo Ordens de Serviço é tocada
- **Sem impacto em auth**: `user_module_access` e admins existentes preservados
- **Idempotência**: se qualquer migration falhar, as anteriores permanecem aplicadas e podem ser retomadas

## Fora do escopo (não será feito)
- Não aplicar o arquivo `20260727123000_wire_tray_schema_reconciliation.sql` como bloco único (limitação prática da interface de tool; conteúdo é idêntico ao das 4 originais)
- Não modificar `.env`, `client.ts`, `types.ts` manualmente (tipos serão regenerados)
- Não tocar em `auth.*`, `storage.*` além dos buckets do módulo
