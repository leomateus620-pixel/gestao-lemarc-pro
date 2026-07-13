## Problema no PDF · Serviço executado

Em `src/components/reports/print/ServiceOrderReportDocument.tsx` (linhas 170–181) o resumo do serviço executado por técnico é montado assim:

```ts
const intervalos = list.length;
`${idx}. ${name}: ${intervalos} intervalo(s) · ${formatHHmm(totalMin)} trabalhadas`
```

Duas inconsistências que o usuário reportou:

1. **Contagem de "intervalos" inflada.** Uma pausa + retomada gera **dois** `labor_entries` (a sessão antes da pausa e a sessão depois). O código conta cada sessão como um intervalo, então pausar/retomar 1x mostra "2 intervalos". A semântica correta de "intervalo" no PDF é o número de **pausas**, que é `sessões − 1`. Pausar 2x/retomar 2x → 3 sessões → 2 intervalos. Sem pausa → 0 intervalos.

2. **Rótulo incompleto.** Hoje sai "02:34 trabalhadas". O padrão desejado é "**02:34 horas trabalhadas**".

## Correção

Ajustar somente o bloco de montagem `executedSummaryLines` em `ServiceOrderReportDocument.tsx`:

```ts
const sessoes = list.length;
const intervalos = Math.max(0, sessoes - 1);
const intervalosLabel =
  intervalos === 0
    ? "sem intervalos"
    : `${intervalos} ${intervalos === 1 ? "intervalo" : "intervalos"}`;
executedSummaryLines.push(
  `${summaryIndex}. ${name}: ${intervalosLabel} · ${formatHHmm(totalMin)} horas trabalhadas`,
);
```

Resultado:
- 1 sessão → "1. Fulano: sem intervalos · 02:34 horas trabalhadas"
- 2 sessões (1 pausa) → "1. Fulano: 1 intervalo · 02:34 horas trabalhadas"
- 3 sessões (2 pausas) → "1. Fulano: 2 intervalos · 02:34 horas trabalhadas"

## Verificação

- `tsgo` typecheck.
- Baixar o PDF de uma OS com histórico conhecido (ex.: OS com pausa/retomada única) e conferir visualmente na seção "Serviço executado" que o número de intervalos bate com o número real de pausas e que o rótulo agora inclui "horas trabalhadas".
- Rodar os testes existentes (`bunx vitest run src/components/reports`) para garantir que nenhum snapshot/lógica de relatório quebra.

## Escopo

Apenas texto do resumo dentro do documento PDF. Nenhuma mudança em `labor_entries`, cálculos financeiros, apuração de horas, banco ou relatórios agregados — as horas trabalhadas continuam somando `duration_minutes` de todas as sessões.
