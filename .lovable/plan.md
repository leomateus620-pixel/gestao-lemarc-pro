## Problemas identificados

**1. UI desalinhada em `/ordens`**  
O `MetricPeriodFilter` é um card com fundo próprio, padding e label "PERÍODO" empilhado — muito maior que os outros selects (Status, Prioridade, Cliente, Técnico, Mais recentes) dentro do `OperationalFilterBar`. Em telas médias/largas ele quebra o grid e força a linha de filtros a duas fileiras (visível no print). Nada se alinha à altura de 44 px dos `Select`.

**2. Lista de OS ignora o período selecionado**  
Em `src/lib/serviceOrders/period.ts`, `isInPeriod` inclui uma OS se **`opened_at` OU `updated_at`** cai na janela:

```ts
const timestamps = [opened, updated].filter(Number.isFinite);
return timestamps.some(...)
```

Consequência: qualquer OS tocada hoje (mudança de status, anotação, apuração) aparece em "Hoje/Semana/Mês" mesmo tendo sido aberta há semanas. É por isso que a seleção "Mês" mostra OS que não pertencem ao mês. Além disso, os KPIs (Horas/Valor apurados) somam essas OS estranhas ao período.

## Correções

### A. Filtro por período correto (`src/lib/serviceOrders/period.ts`)
- `isInPeriod` passa a usar **apenas `opened_at`** como âncora do período. É a data operacional que o usuário enxerga como "quando a OS aconteceu" e é o critério consistente com os rótulos ("no mês atual", "na semana atual").
- Mantém `"all"` retornando tudo e `"custom"` respeitando `from/to` já existentes.
- Sem mudanças de assinatura — `filterByPeriod` continua igual, então KPIs, lista e ordenação corrigem juntos automaticamente.

### B. UI do seletor alinhada ao filtro bar (`src/components/dashboard/MetricPeriodFilter.tsx` + `_app.ordens.index.tsx`)
- Reduzir a "casca" quando usado dentro do filter bar: remover o card grande com padding, deixar somente o `label` inline + trilha de chips na mesma altura (h-11) dos `Select` vizinhos.
- Estratégia: aceitar uma prop `variant?: "card" | "inline"` (default `"card"` para não afetar o dashboard). Em `/ordens`, passar `variant="inline"`, que renderiza:
  - container `flex items-center gap-2 h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2`
  - label "Período" compacta com o ícone
  - chips com `h-8`
  - Painel "Personalizado" continua abaixo, mas alinhado à largura do controle e sem duplicar o card externo.
- Ajustar o grid do `OperationalFilterBar` container em `_app.ordens.index.tsx` para que o `MetricPeriodFilter` inline compartilhe a mesma trilha (`min-w-0`, `shrink` compatível) — o filter bar já é grid/flex; garantir que o filtro de período não force `w-full sm:w-auto` incompatível.
- Painel "Personalizado" (calendário duplo + Aplicar/Hoje) é ancorado abaixo da barra apenas quando `value === "custom"`, sem afetar layout dos outros filtros.

### C. Verificação
- Rodar `tsgo` para checar tipos.
- Playwright: abrir `/ordens`, verificar (i) alinhamento dos filtros em uma única linha em ≥1280 px; (ii) alternar "Hoje", "Semana", "Mês" — número de OS listadas e KPIs (Horas/Valor apurados) mudam de acordo e não incluem OS abertas fora da janela; (iii) "Personalizado" abre o painel de datas e aplica.
- Não alterar o dashboard (permanece `variant="card"`).

## Escopo
- Sem mudanças de dados, migrations ou funções server.
- Sem impacto em PDF/OS individual — puramente filtragem e layout na tela de lista.
