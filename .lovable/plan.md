# Visão por técnico em tela dedicada

## Objetivo
Tirar a seção "Desempenho do técnico" do meio da página de Relatórios (que hoje alonga e polui a tela) e movê-la para uma **tela própria, limpa e focada**, aberta a partir do filtro de técnico.

## O que muda

### 1. Nova tela dedicada: `/relatorios/tecnico/$id`
Nova rota `src/routes/_app.relatorios.tecnico.$id.tsx` (somente admin), que reutiliza `getTechnicianReport` e `TechnicianReportSection` já existentes. Layout dedicado:

- **Cabeçalho próprio**: botão "Voltar aos relatórios", nome do técnico em destaque, função e o período analisado.
- **3 cartões-resumo** (OS no período, Horas, Valor total) em destaque no topo, alinhados em grade.
- **Lista de OS** ocupando a largura útil da tela: tabela no desktop, cartões no celular (como hoje), com número da OS (link), data, título, status, horas e valor dele, e rodapé com totais.
- A tela recebe os **mesmos filtros do relatório** (período, cliente, status etc.) via parâmetros de busca, então os números batem com o que o admin estava vendo.
- `head()` próprio com título "Desempenho do técnico — Gestão Lemarc".

### 2. Página de Relatórios mais limpa
Em `src/routes/_app.relatorios.tsx`:

- **Remover** a seção inline `TechnicianReportSectionLoader` (o "excesso de tela").
- No lugar, quando houver técnico selecionado, mostrar apenas um **cartão compacto de uma linha**: avatar/ícone, nome do técnico, resumo curto ("X OS · Yh · R$ Z no período") e botão **"Ver desempenho completo"** que abre a tela dedicada levando os filtros atuais.
- O restante da página (KPIs, comparativos, gráficos, ações) permanece intacto.

### 3. Ajustes de exibição na seção reutilizada
Pequenos refinamentos em `TechnicianReportSection.tsx` para a tela dedicada: título da OS sem truncar em telas largas, colunas com alinhamento consistente, espaçamento entre cartões e largura máxima confortável de leitura.

## Fora de escopo
- Nenhuma mudança em dados, cálculos, filtros ou na função `getTechnicianReport`.
- Nenhuma mudança visual no restante da página de relatórios.

## Validação
- Build + verificação de tipos.
- Teste no navegador: selecionar técnico nos filtros → ver o cartão compacto → abrir a tela dedicada → conferir números (ex.: Douglas: 70 OS, R$ 21.516) e o link de cada OS.
