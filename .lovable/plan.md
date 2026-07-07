## Diagnóstico

Confirmei no banco que a OS afetada (ex.: `408aa471…`) tem **duas linhas** em `service_order_technicians` (Juan e Omar), e as políticas de RLS permitem a leitura para admin/dono da OS. Ou seja, os dados estão sendo **salvos corretamente** pelo `createServiceOrder` (payload `technician_ids` já é enviado como array pelo `ServiceOrderWizard`).

O bug está no **caminho de leitura + normalização + fallback**, não no salvamento:

1. Em `ORDER_SELECT` (`src/lib/api/serviceOrders.functions.ts`), o embed aninhado usa o mesmo alias `technician:technicians(...)` tanto no nível raiz quanto dentro de `assigned_technicians`. O PostgREST resolve, mas fica sensível a mudanças de FK; sem hint explícito (`!service_order_technicians_technician_id_fkey`) qualquer nova FK futura pode reduzir o retorno silenciosamente. Além disso, quando o embed nested devolve apenas um item por qualquer motivo (linha órfã, técnico inativo filtrado por policy nova, etc.), a UI cai no fallback legado.
2. `getOrderTechnicians` (`src/lib/serviceOrders/technicians.ts`) devolve `order.technicians` **ou** o legado `order.technician`, sem nunca fundir os dois. Se por qualquer motivo o array M2M vier incompleto (ex.: 1 item), o técnico principal do campo legado nunca é reincorporado, e a UI e o `ServiceOrderTimeControl` ficam com um único técnico — exatamente o sintoma relatado.
3. `ServiceOrderTimeControl` consome direto o resultado de `getOrderTechnicians`, então herda o mesmo defeito.

## Correções

Alterar apenas 3 arquivos (sem nova rota, sem nova tabela, sem migração):

### 1. `src/lib/api/serviceOrders.functions.ts`
- No `ORDER_SELECT`, desambiguar o embed aninhado para não depender de heurística:
  ```
  assigned_technicians:service_order_technicians!service_order_technicians_service_order_id_fkey(
    is_primary, role,
    technician:technicians!service_order_technicians_technician_id_fkey(
      id, full_name, role, hourly_rate_cents
    )
  )
  ```
- Em `normalize()`, garantir deduplicação por `id` e preservar `is_primary`/`assignment_role` corretos ao mesclar (nenhuma mudança de contrato de tipo).

### 2. `src/lib/serviceOrders/technicians.ts`
Reescrever `getOrderTechnicians` para **fundir** M2M + legado em vez de escolher um dos dois:
- Começa pela lista `order.technicians` (M2M).
- Se `order.technician` existir e ainda não estiver na lista, injeta como principal.
- Se nenhum item estiver marcado `is_primary`, promove o que coincide com `order.technician_id`, ou o primeiro.
- Deduplica por `id` preservando o primeiro registro (que já traz `is_primary`).
- Ordena com `is_primary` primeiro, mantendo a ordem estável dos demais.

Isso mantém 100% do comportamento atual quando o M2M já tem tudo, e cobre qualquer regressão de leitura sem esconder o problema.

### 3. `src/components/ordens/ServiceOrderTimeControl.tsx`
Nenhuma mudança de lógica — só se beneficia automaticamente da correção do `getOrderTechnicians`. Confirmar que `bulkStartMut` continua sendo disparado pelo botão "Iniciar serviço" do `_app.ordens.$id.tsx` (que já usa `technicians.map(...)` via `Promise.allSettled` para iniciar sessão de cada técnico).

## O que NÃO muda
- `ServiceOrderWizard` (payload já correto).
- `createServiceOrder` / `setServiceOrderTechnicians` (persistência já correta).
- Enums, tipos, RLS, políticas, grants, migrações.
- Fluxo de pausa/retomada individual (`pauseWork`/`resumeWork` continuam por `technicianId`).
- Finalização, assinatura, anexos, notificações, PDF, relatórios, revisão financeira.
- Restrição do técnico de ver valores financeiros.

## Validação

Após as alterações vou:
1. Rodar typecheck (`tsgo --noEmit`).
2. Consultar `service_order_technicians` no banco para confirmar 2 linhas em OS de teste.
3. Abrir a OS `408aa471…` no preview autenticado como admin via Playwright, e confirmar:
   - Cabeçalho da OS lista os dois nomes separados por vírgula.
   - Seção **Técnicos responsáveis** renderiza os dois cards, com "Principal" no primeiro.
   - **Controle de tempo da OS** mostra o seletor com os dois técnicos.
   - Clicar em **Iniciar serviço** dispara `Promise.allSettled` e ambos os cronômetros começam.
   - Pausar apenas um mantém o outro rodando (via `pauseWork` scoped por `technicianId`).
4. Repetir com uma OS de 1 técnico só para garantir que segue funcionando.
5. Recarregar a OS e confirmar persistência.

Todo o conteúdo visível permanece em pt-BR.
