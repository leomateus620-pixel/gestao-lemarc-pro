## Problema
O usuário quer retirar a exibição de "intervalo(s)" do campo **SERVIÇO EXECUTADO** no PDF da OS. Hoje aparece:

```
1. DOUGLAS FLORES: 1 intervalo · 02:34 horas trabalhadas
```

O desejado é mostrar apenas o nome do técnico e as horas trabalhadas:

```
1. DOUGLAS FLORES: 02:34 horas trabalhadas
```

## Onde aplicar
A lógica de resumo do "Serviço executado" existe em dois lugares e ambos precisam ficar consistentes:

1. `src/components/reports/print/ServiceOrderReportDocument.tsx` — componente de pré-visualização/impressão React.
2. `src/lib/reports/serviceOrderDownload.ts` — geração do PDF via jsPDF.

## Mudança aplicada
Removida a variável `intervalos` e o `intervalosLabel` dos blocos de resumo, deixando apenas nome + horas:

```ts
executedSummaryLines.push(
  `${summaryIndex}. ${name}: ${formatHHmm(totalMin)} horas trabalhadas`,
);
```

No download, o formato foi unificado e agora também inclui "horas trabalhadas":

```ts
executedDescriptions.push(
  `${summaryIdx}. ${name}: ${formatHHmm(totalMin)} horas trabalhadas`,
);
```

## Escopo e impacto
- Apenas texto de apresentação no PDF.
- Nenhuma mudança em `labor_entries`, cálculo de horas, fluxo de pausa/retomada, banco de dados ou apuração financeira.
- Alteração puramente de renderização: aplicará automaticamente a todas as OS finalizadas (ao gerar/regerar o PDF) e a novas OS abertas, sem necessidade de migração.

## Verificação
- `bunx tsgo --noEmit` — sem erros de tipo.
- `bunx vitest run src/lib/reports src/components/reports` — 11 testes passaram.
- Teste no preview: clique no botão "PDF" da lista de OS executou sem erros.

## Status
Concluído.
