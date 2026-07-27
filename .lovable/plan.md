# Reconciliação definitiva do módulo Leitos Aramados

## Estado atual confirmado (inspeção pré-plano)

- Projeto Supabase associado: `lvsljgctwwovxcswtfwu` (a confirmar no momento da aplicação via `supabase--project_info`).
- **Nenhuma** tabela `wire_tray_*` existe em `public` (0 linhas em `pg_tables`).
- **Nenhuma** view `wire_tray_*` existe (0 linhas em `pg_views`).
- `user_module_access` já foi criada anteriormente (fundação mínima presente — usado hoje pelo login).
- Migration reconciliadora existe: `supabase/migrations/20260727123000_wire_tray_schema_reconciliation.sql` (4112 linhas), ainda não aplicada.
- Cenário identificado: **Cenário A** do briefing — só a fundação mínima existe; a migration reconciliadora é a via correta.

Observação: as migrations `20260721133000..133300` existem no repositório mas não foram materializadas no banco remoto; a migration `20260727123000` foi escrita justamente para reconstruir o schema operacional de forma idempotente e transacional. Não vou reaplicar as antigas em separado (evita colisões conforme o próprio briefing).

## Ordem de execução

```text
1. Confirmar projeto              →  supabase--project_info
2. Aplicar reconciliação          →  supabase--migration (single tx, do arquivo existente)
3. Recarregar PostgREST           →  NOTIFY pgrst embutido na migration
4. Validar contrato no banco      →  scripts/validate-wire-tray-reconciliation.mjs
5. Regenerar types do remoto      →  scripts/sync-wire-tray-supabase-types.mjs
6. Rodar supabase--linter         →  corrigir apenas achados novos
7. Typecheck + lint + testes      →  tsgo / eslint / vitest / build
8. Smoke autenticado              →  Playwright em /leitos/*  (requer credencial)
```

### 1. Confirmar backend
Chamar `supabase--project_info` e comparar com `lvsljgctwwovxcswtfwu` antes de qualquer DDL.

### 2. Aplicar a migration reconciliadora
Enviar o conteúdo integral de `20260727123000_wire_tray_schema_reconciliation.sql` via `supabase--migration` — o arquivo já é transacional, idempotente, aditivo, contém guard de implantação parcial, `NOTIFY pgrst 'reload schema'` e `NOTIFY pgrst 'reload config'`. Nenhuma edição SQL nova é criada; se a migration abortar pelo guard (Cenário C), paro e reporto o estado exato ao usuário — não contorno o guard.

### 3. Validar o contrato do banco
- `node scripts/validate-wire-tray-reconciliation.mjs` (contra o remoto reconciliado).
- `supabase--linter` — corrigir apenas regressões introduzidas por esta migration; achados pré-existentes ficam listados no relatório.
- Consultas leves via `supabase--read_query` a cada tabela/view esperada para confirmar ausência de `PGRST205`.

Objetos que devem existir após o passo (checklist do briefing §7):
tabelas `wire_tray_stock_locations`, `wire_tray_products`, `wire_tray_stock_balances`, `wire_tray_orders`, `wire_tray_order_items`, `wire_tray_order_financials`, `wire_tray_order_item_financials`, `wire_tray_reservations`, `wire_tray_production_orders`, `wire_tray_production_entries`, `wire_tray_documents`, `wire_tray_separation_entries`, `wire_tray_stock_movements`, `wire_tray_notifications`, `wire_tray_audit_events`, `wire_tray_operation_requests`; views `wire_tray_projected_inventory`, `wire_tray_inventory_catalog` (ambas `security_invoker = true`); enums, RPCs, policies por papel, grants para `authenticated` e `service_role`, bucket privado `wire-tray-documents` + policies de storage.

### 4. Regerar tipos TypeScript do remoto
Gerar dump do schema remoto em `/tmp/wt-types.ts` e rodar:

```bash
node scripts/sync-wire-tray-supabase-types.mjs --source=/tmp/wt-types.ts --write
node scripts/sync-wire-tray-supabase-types.mjs --source=/tmp/wt-types.ts   # deve reportar sem diferenças
```

Isso preserva os tipos do módulo OS e sincroniza só os objetos de Leitos.

### 5. Camada de dados (frontend) — apenas se surgir divergência
Após regenerar tipos, revisar arquivos que hoje usam `as any` para o módulo (moduleAccess/dashboard/etc.) e remover casts onde o novo tipo já cobrir. Isto é aditivo — não altera regra de negócio, rota, autenticação nem o módulo OS. Se todas as consultas atuais permanecerem compatíveis (esperado, pois já funcionam contra o schema descrito), não haverá mudanças de código nesta etapa.

Comportamento React Query já implementado em `src/lib/wireTrays/errors.ts` (`shouldRetryWireTrayQuery`) — vou apenas confirmar que:
- `SCHEMA`/`FORBIDDEN`/`VALIDATION` não fazem retry;
- estados vazios reais permanecem intencionais;
- nenhum erro é convertido silenciosamente em `[]`.

### 6. Verificação técnica
- `tsgo` (typecheck)
- `bunx eslint` nos arquivos tocados
- `bunx vitest run src/lib/wireTrays src/hooks/useWireTray.test.ts`
- `bun run build`

### 7. Smoke autenticado (requer credencial)
Playwright headless com sessão restaurada (`LOVABLE_BROWSER_AUTH_STATUS=injected`), percorrendo as rotas listadas no briefing §13 e capturando um screenshot por rota. **Bloqueio previsto:** se a sessão não estiver injetada, paro exatamente neste gate e peço ao usuário para logar na preview (nunca uso senha em texto claro nem faço bypass).

Fluxo persistente do §14 (criar produto → entrada de estoque → pedido → produção → separação → faturamento) só é executado se o smoke básico passar e o usuário autorizar gravação em produção. Registro apenas UUIDs, sem PII.

### 8. Responsividade
Playwright em 360×800, 390×844, 768×1024, 1280×800, 1440×900, 1920×1080 nas rotas críticas de Leitos, screenshots comparativos. Correções cosméticas ficam para uma segunda passada — este ciclo prioriza restaurar a cadeia operacional.

## Fora de escopo (garantias explícitas)

- Não toco em `AuthContext`, `login`, OAuth, provedores, roteamento raiz.
- Não altero nenhuma tabela/rota do módulo OS.
- Não crio mocks, dados fake, bypass de RLS, grants abertos.
- Não faço `DROP` nem `TRUNCATE`; nada de reset de banco.
- Não exponho credenciais em código, logs, screenshots ou relatórios.

## Gates que podem me travar (paro e reporto)

1. `supabase--project_info` retornar um projeto diferente de `lvsljgctwwovxcswtfwu`.
2. Migration abortar pelo guard de implantação parcial (Cenário C) → reporto tabelas encontradas.
3. `supabase--linter` acusar problema novo introduzido pela migration.
4. Credencial de smoke autenticado ausente ou recusada.
5. Autorização para o fluxo persistente §14 não confirmada pelo usuário.

## Detalhes técnicos

- Migration `20260727123000` já contém `BEGIN`/`COMMIT`, `pg_advisory_xact_lock`, guard de estado parcial, `NOTIFY pgrst`. Nada disso será modificado.
- Views `wire_tray_projected_inventory` e `wire_tray_inventory_catalog` devem ficar `security_invoker = on` (confirmar via `pg_class.reloptions`).
- Funções `SECURITY DEFINER` devem manter `SET search_path = public` (confirmar via `pg_proc.proconfig`).
- Bucket `wire-tray-documents` privado com policies por `auth.uid()` e registro persistido — confirmar em `storage.buckets` / `storage.policies`.
- Reload do PostgREST: apenas via `NOTIFY pgrst` — nenhum restart de infraestrutura.

## Entregável final (relatório)

Ao final, produzo o relatório do §17 do briefing (projeto confirmado, estado inicial, estratégia, objetos criados/validados, RLS/papéis validados, resultado dos scripts, rotas testadas, limitações), com as confirmações explícitas exigidas.