
## Diagnóstico

Inspeção dos arquivos do menu Relatórios e da base real:

**Banco (service_orders, 9 OS):**
- `worked_minutes` → 0/9 preenchidos
- `hour_rate` → 0/9 preenchidos
- `started_at` → 8/9 preenchidos
- `finished_at` → 6/9 preenchidos
- `closed_at` → 6/9 preenchidos

Ou seja: os indicadores estão **corretamente zerados** quando dependem de `worked_minutes` e `hour_rate`, porque nenhuma OS tem esses campos. O problema real é que (a) há fonte alternativa (`started_at`/`finished_at`) que não está sendo usada e (b) as mensagens não deixam claro o motivo do zero.

**Filtros / 404:**
- `ReportsFilters` usa `useNavigate({ from: routePath })` com `replace: true` e updater de `search` que apaga chaves `null|undefined|""|false`. Quando a rota for `/_app/relatorios/cliente/$clientId`, navegar apenas com `search` pode disparar erro em modo strict (params perdidos).
- `Input type="date"` grava `from`/`to` como ISO datetime (`new Date(value).toISOString()`) misturado com `slice(0,10)` para exibir — funciona, mas conflita com `ReportGenerateDialog` que grava `from`/`to` como `YYYY-MM-DD`. Resultado: parsing inconsistente entre as duas telas.
- `resolvePeriodRange` faz `new Date(filters.from)` sem normalizar início/fim do dia → janela 1 dia mais curta no fuso BRT.
- Não há validação de "data inicial > data final" em `ReportsFilters` (só no diálogo de relatório gerencial).
- Período `month` é descrito como "Mês atual / últimos 30 dias", mas o cálculo usa `setMonth(-1)` (mês calendárico, não 30 dias).
- `ClientReportDrawer.go()` só envia `search: { period }` — perde demais filtros, mas não causa 404; comportamento OK.

**Indicadores zerados / vagos:**
- "Horas trabalhadas" e "Valor estimado" zeram porque `worked_minutes` é sempre nulo. Sem fallback de `started_at`/`finished_at`, ficam em 0 com legenda genérica.
- "Ticket médio" depende de `estimated_value` por OS — sem `hour_rate`, fica em `—`.
- "Tempo médio" usa `opened_at`/`closed_at`. Funciona, mas só 6 OS têm `closed_at`. OK.
- Agrupamento por cliente já é por `client_id` (não por nome) — sem duplicação real; o que aparece no print são clientes com nomes parecidos, não duplicação.

## Plano de correção (apenas frontend/server-fn, sem nova migration)

### 1. Períodos previsíveis e datas seguras (`src/lib/reports/filters.ts`)

- Padronizar `from`/`to` como `YYYY-MM-DD` em toda a aplicação (search params, inputs, server fn). Schema Zod passa a usar `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)` com `fallback` para `undefined`.
- Reescrever `resolvePeriodRange`:
  - `today`: hoje 00:00 → hoje 23:59:59.999.
  - `week`: hoje − 7 dias 00:00 → agora.
  - `month`: hoje − 30 dias 00:00 → agora (alinha com a label "últimos 30 dias"; renomear label para "Mês (30 dias)").
  - `last30`: idem `month` (mantido para compatibilidade do diálogo gerencial).
  - `quarter` / `year` / `today`: análogos com início do dia.
  - `custom`: `from` → início do dia local; `to` → fim do dia local; se um dos dois faltar, ignorar o lado faltante; se `from > to`, retornar `{ from: null, to: null }` e a UI mostra erro.
  - Conversão local → UTC ISO só na chamada Supabase.
- Validar `from`/`to` no parser; valores fora do padrão caem para `undefined` em vez de quebrar.

### 2. Corrigir 404 / navegação dos filtros (`src/components/reports/ReportsFilters.tsx`)

- Trocar `useNavigate({ from: routePath })` por `useNavigate()` chamado com `to: routePath` explícito e `params` opcionais (preserva params em rotas filhas).
- Garantir `type="button"` em todos os `<Button>` dentro do `Sheet` (já são `<button>` shadcn, mas reforçar o atributo no botão "Aplicar" / "Limpar tudo" para evitar submit acidental).
- `Sheet` "Aplicar" só fecha — não navega. "Limpar tudo" agora usa o mesmo `setSearch` patch (mantém URL como `/relatorios?period=month`).
- Validar `from > to` em tempo real: ao detectar, mostra mensagem `"Período inválido. Verifique a data inicial e final."` abaixo dos inputs de data e **não** dispara navegação inválida (o estado vira `period: custom` sem aplicar range, query roda com fallback).
- Inputs `type="date"` passam a salvar a string crua `YYYY-MM-DD` (sem `new Date().toISOString()`).

### 3. Derivar horas reais quando `worked_minutes` for nulo (`src/lib/reports/metrics.ts`)

- `computeOrderRow` ganha fallback:
  - Se `worked_minutes` nulo e `started_at` + `finished_at` existem → `derived_minutes = clamp((finished_at − started_at) / 60s, 0, 24h)`.
  - Campo novo `worked_minutes_effective` (não substitui o real no banco, é só derivação no client/server fn).
  - `estimated_value` continua `effective_minutes / 60 * hour_rate` (zera quando rate é nulo — comportamento honesto).
- `ROW_SELECT` em `reports.functions.ts` passa a buscar `started_at`, `finished_at`.
- `ReportOrderRow` ganha `worked_minutes_effective: number` (sempre número, 0 quando não há dados).
- KPIs de horas e gráfico "Horas por técnico" passam a usar `worked_minutes_effective`.

### 4. Mensagens de dados ausentes mais claras (`_app.relatorios.tsx`)

- "Horas trabalhadas": subtítulo dinâmico
  - `> 0` derivado → "Calculado de start → finish quando worked_minutes ausente."
  - `worked_minutes` populado → "Soma de worked_minutes informado."
  - `0` → "Sem horas trabalhadas registradas no período."
- "Valor estimado": quando todas as OS estão sem `hour_rate` → "Configure hour_rate nas OS para calcular valores." (com ícone `AlertTriangle` discreto).
- "Ticket médio": "Sem OS concluída com hour_rate configurado." quando aplicável.
- Gráficos "Horas por técnico" e "Valor estimado por cliente" já têm `emptyLabel` — atualizar texto para o mesmo padrão.

### 5. Filtros aplicados refletem em tudo

- `useReportOrdersQuery` já chaveia por todos os filtros (`filtersKey`). Sem alteração funcional, mas vou auditar para incluir `from`/`to` mesmo quando `period` ≠ `custom` (no momento já inclui).
- Tabela de OS e exportação (`ReportExportActions`) continuam recebendo o mesmo array `rows` — nada a alterar; só conferir após mudança de tipos.

### 6. Validações defensivas

- Em `computeOverview` / `computeSeries`: nunca dividir por zero (já protegido).
- `new Date(opened_at)` continua, mas quando inválido pula a entrada (já há `Number.isNaN`).
- `PERIOD_OPTIONS` reorganizado para refletir labels reais ("Hoje", "Semana", "Mês (30 dias)", "Últimos 30 dias", "Trimestre", "Ano", "Tudo", "Personalizado").

### 7. Validação

- `npm run build` (TanStack code-splitter + tsgo).
- Playwright headless rápido: navegar `/relatorios`, alternar período (semana, mês, hoje, personalizado válido, personalizado inválido), aplicar filtro de cliente/status no Sheet, conferir que (a) não há 404, (b) URL fica `/relatorios?period=...`, (c) cards de horas mostram valor derivado de start/finish nas OS finalizadas.
- Conferência manual de mobile (390px) via screenshot.

## Arquivos afetados

```text
src/lib/reports/filters.ts             # períodos, parser de datas, validação
src/lib/reports/metrics.ts             # fallback worked_minutes, tipos
src/lib/api/reports.functions.ts       # SELECT inclui started_at/finished_at
src/types/reports.ts                   # ReportOrderRow.worked_minutes_effective
src/components/reports/ReportsFilters.tsx       # navegação + validação custom
src/components/reports/ReportGenerateDialog.tsx # alinhar with from/to YYYY-MM-DD
src/routes/_app.relatorios.tsx                  # subtítulos honestos dos KPIs
```

Nenhuma rota, RLS, auth ou migration alterada. Nenhum mock reintroduzido.
