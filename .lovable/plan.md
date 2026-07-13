## Diagnóstico

Revisei o código atual e o texto "intervalo" **já foi removido** dos dois únicos caminhos que geram o PDF/print da OS:

- `src/components/reports/print/ServiceOrderReportDocument.tsx` (linha 176-178) — renderização do print / pré-visualização
- `src/lib/reports/serviceOrderDownload.ts` (linha 673-675) — geração do PDF via jsPDF

Ambos produzem exatamente:
```
${idx}. ${nome}: ${HH:mm} horas trabalhadas
```

Uma busca global (`rg -i "intervalo"` em `src/`) só encontra "intervalo" em:
- `financials.functions.ts:147` → campo `description` de cada linha da **tabela de execução** (coluna "Descrição" por lançamento), não no bloco "Serviço executado".
- `FinalizeServiceOrderDialog.tsx:222` → mesmo texto para lançamentos derivados.
- Textos informativos ("Horas trabalhadas não incluem intervalos de pausa") — não é o alvo.

## Hipótese principal

A screenshot enviada mostra `1. Leonardo: 1 intervalo · 00:02 trabalhadas` (sem "horas" antes de "trabalhadas"), formato que **não existe no código atual** (o atual é `... 00:02 horas trabalhadas`). Isso indica que a tela vista é uma versão **em cache** — provavelmente:

1. PDF/aba do print aberto antes da última correção e não recarregado, ou
2. Ambiente publicado (`gestao-lemarc-pro.lovable.app`) que ainda não foi republicado após a correção.

## Plano

1. **Verificar ao vivo com Playwright**: abrir a rota `/ordens/{id}/imprimir` de uma OS finalizada no preview, imprimir para PDF, e conferir se o texto atual do bloco "Serviço executado" já é `N. Nome: HH:mm horas trabalhadas` (sem "intervalo").

2. **Se estiver correto no preview**: orientar hard-refresh (Ctrl+Shift+R) e republicar o app para atualizar `gestao-lemarc-pro.lovable.app`. Nenhuma mudança de código será necessária.

3. **Se ainda aparecer "intervalo" no preview**: significa que existe um terceiro caminho de geração que não localizei nas buscas. Nesse caso vou:
   - Rastrear o botão/fluxo exato que gerou a screenshot (ServiceOrderCard vs ServiceOrderIslandRow vs /imprimir).
   - Confirmar se `financials.notes` de OS antigas armazena o texto "1 intervalo · 00:02 trabalhadas" (persistido em finalize antigo) — se sim, sanitizar na renderização removendo o prefixo "N intervalo · ".
   - Aplicar a correção no caminho identificado.

4. **Adicionar teste de regressão** em `src/lib/reports/` verificando que o output do resumo executado nunca contém a substring "intervalo".

5. **Verificação final**: `bunx tsgo --noEmit`, `bunx vitest run src/lib/reports src/components/reports`, e screenshot Playwright do PDF regenerado.

## Escopo

Puramente apresentação (texto do PDF). Sem alterar `labor_entries`, cálculo de horas, fluxo de pausa/retomada, apuração financeira ou banco.
