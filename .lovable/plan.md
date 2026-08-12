# Puxar o KM da unidade na etapa de revisão

## O que está acontecendo

O sistema já sabe sugerir o deslocamento (KM da unidade × valor por km, hoje R$ 2,50 cadastrado nas Configurações), mas a sugestão só aparece quando a OS ainda não tem nenhum registro financeiro.

Verificando a base: toda OS já ganha um registro financeiro automaticamente quando as horas são apuradas — e esse registro nasce com deslocamento "Nenhum", 0 km, R$ 0,00. Como já existe registro, a revisão entende que "o admin já escolheu" e não sugere nada. É por isso que OS como a #1102 (Casa Tucunduva, 60 km), #1092 (Casa Santo Augusto, 190 km), #1087 (Casa Cruzeiro, 12 km) e #1106 (Casa Maçambará, 584 km) abrem a revisão com o campo de km vazio.

## Como vai passar a funcionar

- Na etapa "Deslocamento" da revisão, quando o deslocamento ainda não foi definido de fato (tipo "Nenhum", 0 km, R$ 0,00 e apuração não finalizada), o sistema pré-preenche automaticamente: tipo "Por km", KM = distância cadastrada na unidade, valor por km = valor padrão das Configurações.
- Quantidade de deslocamentos continua em branco (conta como 1) e o total já sai calculado: 60 km × R$ 2,50 = R$ 150,00. Com 2 deslocamentos, 120 km = R$ 300,00 (regra atual mantida).
- Se o admin já definiu o deslocamento antes (por km, valor fixo, ou "Nenhum" com valor salvo/apuração finalizada), nada é sobrescrito — o valor gravado continua mandando.
- O admin pode sempre editar KM, valor e quantidade manualmente; a sugestão é apenas ponto de partida.
- A linha de referência da unidade ("110 km da base · R$ 2,50 por km") passa a aparecer também nesses casos, e o aviso de "valor padrão por km não configurado" segue igual.
- Unidade sem distância cadastrada (ex.: MATRIZ, Fábrica Santa Rosa) continua sem sugestão — nada é inventado. Vale conferir esses cadastros se o deslocamento deve ser cobrado.

## Detalhes técnicos

- `src/components/ordens/FinalizeServiceOrderDialog.tsx`: no hidratar do diálogo, tratar o registro financeiro como "sem deslocamento definido" quando `displacement_type === "none"`, `displacement_total_cents === 0`, `displacement_km_total == 0` e `finalized_at == null`; nesse caso aplicar a mesma sugestão hoje usada quando não há financeiro. Ajustar `hasAutoDisplacementSuggestion` e `missingGlobalRate` para usar esse mesmo predicado, extraído numa função pura auxiliar.
- Cálculo permanece em `src/lib/serviceOrders/finance.ts` (`computeDisplacementCents` / `effectiveDisplacementKm`) — nenhuma mudança de regra.
- Teste unitário para o predicado (financeiro vazio → sugere; financeiro finalizado ou com valores → não sugere) em `src/lib/serviceOrders/finance.test.ts`.
- Nenhuma migração nem reescrita de dados de OS já finalizadas.
