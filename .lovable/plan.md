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

1. `src/components/reports/print/ServiceOrderReportDocument.tsx` — componente de pré-visualização/impressão React (linhas 170-186).
2. `src/lib/reports/serviceOrderDownload.ts` — geração do PDF via jsPDF (linhas 660-688).

## Mudança
Remover a variável `intervalos` e o `intervalosLabel` do bloco `executedSummaryLines`/`executedDescriptions`, deixando apenas:

```ts
executedSummaryLines.push(
  `${summaryIndex}. ${name}: ${formatHHmm(totalMin)} horas trabalhadas`,
);
```

No download, atualizar para o mesmo formato e incluir "horas trabalhadas" (hoje está apenas "trabalhadas"):

```ts
executedDescriptions.push(
  `${summaryIdx}. ${name}: ${formatHHmm(totalMin)} horas trabalhadas`,
);
```

## Escopo e impacto
- Apenas texto de apresentação no PDF.
- Nenhuma mudança em `labor_entries`, cálculo de horas, fluxo de pausa/retomada, banco de dados ou apuração financeira.
- Como é uma alteração puramente de renderização, aplicará automaticamente a todas as OS finalizadas (ao gerar/regerar o PDF) e a novas OS abertas, sem necessidade de migração.

## Verificação
- `bunx tsgo --noEmit` para garantir que não há erros de tipo.
- Verificar visualmente o PDF/print de uma OS com histórico de pausa/retomada para confirmar que o texto de intervalo sumiu e as horas trabalhadas continuam corretas.