# Plano: Ícone com filtro dedicado de técnico nos Relatórios

## Objetivo

Hoje o filtro de técnico fica escondido dentro do menu "Filtros avançados" (Sheet). O admin precisa abrir a aba lateral toda vez para escolher um técnico. Colocar um **ícone com filtro dedicado**, sempre visível na barra de filtros dos Relatórios, para selecionar o técnico rapidamente e ver seu desempenho.

## Comportamento esperado

- Na barra de filtros da página de Relatórios, ao lado do seletor de período, aparece um botão/seletor com **ícone de pessoa (User)** e o texto **"Técnico"**.
- Ao tocar/clicar, abre um **dropdown (Select)** com a lista completa de técnicos (mesma lista que já existe em `useReportLookupsQuery().data.technicians`).
- O primeiro item é **"Todos"** (limpa o filtro).
- Quando um técnico está selecionado, o botão mostra o **nome do técnico** em vez de "Técnico", com um indicador visual (borda/cor primária) e um contador "1" no ícone, igual ao padrão já usado no botão de "Filtros avançados".
- Selecionar um técnico define `technicianId` nos search params (mesmo mecanismo do filtro avançado) — sem mudar a lógica de filtragem.
- O cartão compacto "Desempenho do técnico" + botão "Ver desempenho completo" já existe e aparece automaticamente quando `technicianId` está setado; continua funcionando igual.
- O filtro de técnico dentro de "Filtros avançados" permanece funcionando e sincronizado (ambos usam o mesmo `filters.technicianId`).

## Layout

```text
┌─────────────────────────────────────────────────────────┐
│ Período analisado                                        │
│ [Mês (30 dias) ▼]   [👤 Técnico ▼]   [⚙ Filtros avançados]│
│                                                          │
│ 📅 Mês (30 dias)   [chips de filtros ativos...]           │
└─────────────────────────────────────────────────────────┘
```

Quando técnico selecionado:
```text
[👤 Douglas Flores ▼]   ← borda primária, badge "1"
```

## Arquivo a alterar

**`src/components/reports/ReportsFilters.tsx`**

1. Adicionar um `Select` de técnico dedicado na barra de filtros (na seção de controles, ao lado do seletor de período), com:
   - Ícone `User` (lucide-react) no trigger
   - Label "Técnico" quando nenhum selecionado, ou nome do técnico quando selecionado
   - Indicador visual quando ativo (borda primária + badge com "1")
   - Opção "Todos" como primeiro item
   - Lista de técnicos de `lookups.data.technicians`
   - `onChange` → `setSearch({ technicianId: value === ALL ? null : value })`

2. O `Select` de técnico dentro do Sheet "Filtros avançados" permanece (já existe na linha 231–239) e continua sincronizado — ambos leem/escrevem o mesmo `filters.technicianId`.

3. Posicionamento: na linha de controles, após o seletor de período, antes do botão "Filtros avançados". Em mobile fica embaixo do período (flex-wrap); em desktop fica ao lado.

## Validação

- `bunx tsgo --noEmit` sem erros
- Build passando
- Teste no navegador: selecionar técnico no novo ícone → cartão compacto aparece → "Ver desempenho completo" abre tela dedicada → voltar → trocar técnico → limpar com "Todos"
- Conferir que o filtro dentro de "Filtros avançados" reflete o mesmo técnico selecionado

## Não muda

- Lógica de filtragem (`matchesFilters`, `getReportOrders`, etc.)
- Tela dedicada `/relatorios/tecnico/$id`
- `TechnicianReportSection` / `TechnicianReportSectionLoader`
- Outros filtros (período, cliente, unidade, status, etc.)
- Schema de search params
