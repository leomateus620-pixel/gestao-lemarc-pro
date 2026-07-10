## Diagnóstico

Na OS #1061 (Leonardo · 18:43→18:50 pausa · 19:39→20:11 fim = 39 min), o PDF mostra **1 linha** com início 18:43 e fim **19:23** (= 18:43 + 40 min). A causa: essa OS foi finalizada **antes** do fix anterior, então o banco (`service_order_labor_entries`) guarda **uma única linha por técnico** com `end_time = start_time + duração total`. O PDF apenas renderiza o que está salvo — por isso divergência de horário e ausência das pausas.

O fix anterior corrigiu apenas o *fluxo de finalização futuro*, mas OSes já finalizadas continuam com dados colapsados. Precisa também:
1. tornar o PDF fiel ao histórico real (`service_order_time_sessions`), mesmo quando os `labor_entries` estão colapsados;
2. reconciliar linhas antigas silenciosamente, sem exigir reabrir a OS.

## Solução

Fonte da verdade sempre = `service_order_time_sessions` (sessões work fechadas). `labor_entries` passa a ser cache derivado.

### 1. `getOrderFinancials` — derivação robusta (`src/lib/api/financials.functions.ts`)

No handler, após buscar labor_entries e financials, também buscar `service_order_time_sessions` da OS. Se houver ≥1 sessão `kind='work'` com `ended_at`:

- Reconstruir a lista de entries a partir das sessões: **uma linha por sessão fechada**, com `work_date`/`start_time`/`end_time` em America/Sao_Paulo derivados de `started_at`/`ended_at`, `duration_minutes = session.duration_minutes`, `hourly_rate_cents` reaproveitado do labor_entry existente do mesmo técnico (ou do cadastro do técnico como fallback), `description = "Intervalo N de M"` ou `"Trabalho executado"`.
- Recalcular `subtotal_cents` por linha e `total_labor_minutes` / `total_labor_cents` / `grand_total_cents` na resposta.
- Se os valores derivados divergirem dos armazenados, disparar um **self-heal** no mesmo handler (apenas para admins): `delete` + `insert` em `labor_entries` e `update` em `service_order_financials` (mantendo tipo de deslocamento, materiais, notas). Falhas de self-heal são engolidas — resposta ao cliente sempre usa os valores derivados.

Isso corrige de imediato a exibição no PDF/tela e, na primeira leitura pós-deploy, normaliza os dados na nuvem sem migration manual.

### 2. Preservar entries manuais

Só reconstruir quando existirem sessões `work` fechadas. OSes finalizadas manualmente (sem controle de tempo) continuam com o que foi digitado. Se o total de minutos das sessões == soma atual de entries e o número de linhas bate, pular self-heal (evita escrita desnecessária).

### 3. PDF — sem mudança estrutural

`ServiceOrderReportDocument.tsx` e `serviceOrderDownload.ts` já agrupam por técnico e mostram intervalos + subtotal. Verificar apenas que:
- os horários exibidos usam `America/Sao_Paulo` (já usam).
- o texto "Serviço executado" reflete N intervalos e horas líquidas (já implementado).
- inclui a nota "Horas trabalhadas não incluem intervalos de pausa" (já incluída).

Nenhuma edição de layout necessária depois do fix na origem.

### 4. Diálogo Finalizar

Sem mudanças — `buildEntriesFromSessions` já gera uma linha por sessão fechada. Se admin reabrir a OS pós-deploy, os entries já virão corretos do backend.

## Fora do escopo

- Migração SQL manual dos dados antigos: substituída pelo self-heal do handler.
- Alterações em RLS, rotas, `time_sessions` schema, ou fluxo de execução da OS na tela ao vivo.
- Ajustes visuais no PDF.

## Detalhes técnicos

Arquivos alterados:
- `src/lib/api/financials.functions.ts`
  - Adicionar consulta a `service_order_time_sessions` (kind=work, ended_at not null) no `getOrderFinancials`.
  - Nova função `deriveEntriesFromSessions(sessions, existingEntries, technicians)` que retorna `LaborEntry[]` derivadas.
  - Comparar contagem de intervalos e soma de `duration_minutes` — se divergir do stored, executar `delete`+`insert` em `labor_entries` e recomputar/`update` em `service_order_financials` (mantendo `displacement_*`, `materials_total_cents`, `notes`).
  - Retornar sempre os entries derivados quando houver sessões; senão, os entries do banco.

Validação:
- OS #1061: PDF deve passar a mostrar 2 linhas (18:43→18:50 · 00:07 e 19:39→20:11 · 00:32), subtotal Leonardo = 00:39, totais coerentes com o card "Total trabalhado" na tela ao vivo.
- OS finalizadas sem sessões (manuais): PDF permanece igual ao que já mostra.
- Reabrir a OS #1061 no diálogo Finalizar: entries já hidratam com 2 linhas.
- Typecheck limpo.
