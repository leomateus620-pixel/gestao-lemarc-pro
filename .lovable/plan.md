# Deslocamento por km: multiplicar pela quantidade

Hoje, no modelo "Por km", o total é apenas `km × valor/km` — a quantidade de deslocamentos é gravada mas ignorada no cálculo. Com 2 deslocamentos de 110 km a R$ 2,50 o sistema mostra R$ 275,00, quando deveria mostrar R$ 550,00 (220 km).

## Como passa a funcionar

- O campo "KM total" passa a ser entendido como o km de cada deslocamento.
- Km efetivo = km informado × quantidade de deslocamentos (quantidade vazia ou 0 conta como 1).
- Total = km efetivo × valor por km.
- Exemplos: 1 × 110 km × R$ 2,50 = R$ 275,00 · 2 × 110 km × R$ 2,50 = R$ 550,00.

## Onde aparece

- Etapa "Deslocamento" da revisão: o card "Total do deslocamento" já reflete o valor multiplicado; ao lado do campo de km aparece apenas o km efetivo quando a quantidade é maior que 1 (ex.: "2 × 110 km = 220 km"), sem alertas nem avisos extras.
- Resumo/revisão final: mesma linha resumida de sempre, com o km efetivo.
- PDF da OS (impressão e download): a linha de deslocamento mostra "2 desloc. · 220 km · R$ 2,50/km · R$ 550,00" — mesma formatação atual, só com o km correto. Nenhum bloco novo, nenhum aviso.

## Detalhes técnicos

- `src/lib/serviceOrders/finance.ts`: `computeDisplacementCents` para `per_km` passa a usar `max(1, count) × km_total × rate_cents`; nova função auxiliar `effectiveDisplacementKm(d)` usada por `describeDisplacement` e pelos documentos.
- `src/lib/serviceOrders/finance.test.ts`: casos para 1 e 2 deslocamentos e para count = 0.
- `src/components/ordens/FinalizeServiceOrderDialog.tsx`: exibe o km efetivo quando `count > 1`; sem mudanças de validação.
- `src/components/reports/print/ServiceOrderReportDocument.tsx` e `src/lib/reports/serviceOrderDownload.ts`: usam o km efetivo (`count × displacement_km_total`) na linha de deslocamento.
- OS já finalizadas mantêm o valor gravado em `displacement_total_cents` (nada é reescrito em massa); ao reabrir o resumo financeiro e salvar, o novo cálculo se aplica.