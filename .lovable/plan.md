## Objetivo

Concluir as pendências do módulo Colaboradores (rotas auxiliares, auditoria de migração, wizard de OS) e validar a robustez do cadastro com um lote temporário de 50 colaboradores realistas (precificação + descrições). Após validar, remover todos os registros de teste.

## Escopo das correções remanescentes

### 1. Rotas auxiliares (consistência das pseudo-abas e links internos)
- `_app.colaboradores.$id.horas.tsx`, `.ordens.tsx`, `.editar.tsx`: revisar para que cada uma renderize a partir do mesmo layout (`<Outlet />` em `_app.colaboradores.tsx`) e use dados reais (`service_order_labor_entries` para horas, OS filtradas por técnico para ordens).
- Garantir breadcrumb/back consistente e estado vazio quando o colaborador não tem dados.
- Remover qualquer link "morto" restante nas pseudo-abas (manter apenas Visão geral + Novo).

### 2. Auditoria da migração `20260629143000_colaboradores_module.sql`
- Conferir: GRANTs por papel, RLS habilitado, policies escopadas a `auth.uid()` ou `has_role`, trigger `technician_rate_history` correto (somente quando `hourly_rate_cents` muda) e índices em `technician_id` nas tabelas referenciadoras.
- Se faltar algo crítico (ex.: GRANT em `technician_rate_history`, policy de SELECT para admins), abrir migração corretiva nova — sem reescrever a existente.

### 3. Wizard de criação de OS (`ServiceOrderWizard.tsx`)
- Etapa de seleção de técnico: filtrar `active = true`, ordenar por nome, mostrar função e R$/h; bloquear seleção de quem está com `hourly_rate_cents = null` e exibir aviso "Defina o valor/hora antes de alocar".
- Confirmar que o `hourly_rate_cents` é "congelado" ao criar o labor entry (já feito em `collaborators.ts`; só validar no fluxo de criação).

### 4. Refinamentos visuais finais
- `CollaboratorIslandRow`: revisar truncamento em viewport ≤375px, garantir `min-w-0` no bloco de nome/função, evitar quebra do pill R$/h.
- `AppShell`/`BottomNav`: confirmar `padding-bottom: calc(64px + env(safe-area-inset-bottom))` na área de conteúdo da lista para que o último card não fique sob a bottom nav.
- Topbar: confirmar `z-index` e ausência de sobreposição com o hero do módulo.

### 5. Form de cadastro (`CollaboratorForm`)
- Validar máscaras CPF/telefone com paste de valores sujos.
- Adicionar validação: nome obrigatório, função obrigatória, R$/h ≥ 0 e ≤ 99.999,99.
- Bloquear submit duplo (`disabled` enquanto `mutation.isPending`).

## Validação com 50 colaboradores (seed temporário)

### Geração
- Script local em `scripts/seed-collaborators.ts` (gitignored ou removido ao final) que usa `createTechnician` via service-role (rodado por `bunx tsx`) para inserir 50 registros com:
  - Nome (pt-BR realista, faker `@faker-js/faker` locale `pt_BR` — já instalado? se não, instalar apenas como devDependency temporária e remover).
  - Função distribuída entre Mecânico Industrial, Eletricista Industrial, Técnico em Automação, Montador, Supervisor de Campo.
  - `hourly_rate_cents` entre R$ 45 e R$ 220, `hourly_rate_50_cents` = +50%, `hourly_rate_100_cents` = +100%.
  - `internal_notes` / `pricing_notes` com descrição contextual ("Especialista em manutenção de prensas hidráulicas. Disponível para turno noturno.").
  - CPF e telefone fake válidos (mascarados), email `teste+{n}@lemarc.local`.
  - 5 com `active = false` para testar filtro inativo; 3 com `hourly_rate_cents = null` para testar pill "A definir".

### Checklist de validação
1. `bun run build` (zero erros).
2. `bunx vitest run src/lib/serviceOrders/collaborators.test.ts`.
3. Browser via Playwright (headless):
   - `/colaboradores` — lista renderiza 50 linhas, scroll fluido, sem overlap com bottom nav, KPIs somam corretamente.
   - Filtro/busca por nome funciona.
   - Inativos aparecem com pill correto, e quando filtro "ativos" está ligado, somem.
   - Pill "A definir" aparece nos 3 sem valor/hora.
   - Click em uma linha → expansão horizontal sem layout shift.
   - Navegação `/colaboradores/novo` abre o form (regressão da correção principal).
   - Detalhe `/colaboradores/$id` carrega dados certos.
   - Wizard de OS lista 50 técnicos sem travar; bloqueia os 3 sem R$/h.
   - Screenshot em 1280×1800 e 375×800.
4. Conferir console e network sem erros 4xx/5xx.

### Limpeza
- `DELETE FROM public.technicians WHERE email LIKE 'teste+%@lemarc.local'` (via tool de insert) — confirmar contagem = 50.
- Conferir cascata: `service_order_technicians`, `service_order_labor_entries`, `technician_rate_history` (não deve haver linhas porque nenhuma OS foi criada com eles).
- Remover `scripts/seed-collaborators.ts` e a dep `@faker-js/faker` se foi adicionada.

## Entregáveis ao final
- Resumo do que foi corrigido (rotas, migração, wizard, visual).
- Resultado do build, do teste unitário e do roteiro Playwright.
- Print(s) chave: lista com 50, expansão de linha, wizard com 50, mobile.
- Confirmação da limpeza (contagem antes/depois).

## Fora de escopo
- Página `/colaboradores/$id` redesign profundo (apenas garantir que dados reais aparecem).
- Mudança de schema além de eventual GRANT/policy faltante.
- Importação em massa via UI (apenas seed script descartável).
