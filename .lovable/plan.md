# Plano: Filtro de período por datas (dia 1 a 30) ao lado do filtro de técnico

## Objetivo

Hoje, para filtrar um intervalo exato de datas (ex.: do dia 1 ao dia 30 do mês), o admin precisa abrir "Filtros avançados" e usar o período "Personalizado". Colocar um **filtro de datas dedicado, sempre visível**, ao lado do seletor de técnico na barra de filtros dos Relatórios — e garantir que ele também funcione na tela dedicada do técnico.

## Comportamento esperado

- Na barra de filtros, ao lado do seletor "Técnico", aparece um botão com **ícone de calendário** e o texto **"Período"**.
- Ao tocar/clicar, abre um painel (Popover) com **dois campos de data: "De" e "Até"** (seletores de calendário), e botões **"Aplicar"** e **"Limpar"**.
- Ao aplicar, o período passa a ser **Personalizado** com as datas escolhidas (ex.: 01/09 a 30/09) — usa o mecanismo já existente (`period: "custom"` + `from`/`to` nos search params), sem mudar a lógica de filtragem.
- Quando um intervalo está ativo, o botão mostra o intervalo resumido (ex.: **"01/09 – 30/09"**) com o mesmo indicador visual do filtro de técnico (borda primária + badge "1").
- "Limpar" volta o período para o padrão (Mês, 30 dias).
- **Tela dedicada do técnico**: o intervalo já viaja pelos parâmetros da URL (a tela `/relatorios/tecnico/$id` já lê os mesmos filtros), então os números do técnico respeitam o período escolhido. O cabeçalho da tela dedicada passa a mostrar o intervalo de datas quando o período for personalizado (ex.: "Período analisado: 01/09 a 30/09") em vez de só "Personalizado".
- O seletor de período já existente (Hoje, Semana, Mês...) continua funcionando; escolher outro período nele substitui o intervalo personalizado, e vice-versa.

## Layout

```text
[Mês (30 dias) ▼]   [👤 Técnico ▼]   [📅 Período ▼]   [⚙ Filtros avançados]
```

Com intervalo ativo:
```text
[📅 01/09 – 30/09 ▼]   ← borda primária, badge "1"
```

## Arquivos a alterar

1. **`src/components/reports/ReportsFilters.tsx`**
   - Adicionar o botão de período por datas (ícone `Calendar`, lucide-react) na linha de controles, após o seletor de técnico e antes de "Filtros avançados".
   - Popover com dois `Calendar` (shadcn, modo `single`, com `pointer-events-auto`) para "De" e "Até", botões "Aplicar" e "Limpar".
   - Ao aplicar: `setSearch({ period: "custom", from, to })` (formato `AAAA-MM-DD`, mesmo do schema atual).
   - Ao limpar: `setSearch({ period: "month", from: null, to: null })`.
   - Indicador visual ativo (borda primária + badge "1") quando `period === "custom"` com datas válidas; rótulo mostra o intervalo formatado em `dd/MM`.
   - Validação: se "De" for depois de "Até", mostrar aviso e não aplicar (regra já existe em `isCustomRangeInvalid`).

2. **`src/routes/_app.relatorios.tecnico.$id.tsx`**
   - No cabeçalho, quando o período for personalizado, exibir o intervalo de datas formatado (ex.: "01/09/2026 a 30/09/2026") em vez de apenas "Personalizado".

## Não muda

- Lógica de filtragem (`resolvePeriodRange`, `matchesFilters`, relatórios) — o período personalizado já existe e já é respeitado em todas as consultas, inclusive na visão do técnico.
- Schema de search params (`period`, `from`, `to` já existem).
- Seletor de período atual e demais filtros.
- O filtro de datas dentro de "Filtros avançados" (se houver) permanece sincronizado, pois ambos usam os mesmos parâmetros.

## Validação

- `bunx tsgo --noEmit` sem erros e build passando.
- Teste no navegador: escolher 01/09 a 30/09 → relatórios filtram pelo intervalo → selecionar técnico → abrir "Ver desempenho completo" → tela dedicada mostra o mesmo intervalo e os números batem → "Limpar" volta ao Mês (30 dias).
