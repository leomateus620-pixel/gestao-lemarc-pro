# KM da unidade e R$ 2,50/km preenchidos automaticamente na revisão

## O que está acontecendo na OS #1087

Consultando a base: a OS #1087 está na unidade Casa Cruzeiro (12 km da base) e o registro financeiro dela está com deslocamento "Nenhum", 0 km, R$ 0,00 — porém com a apuração já marcada como finalizada (06/08). A regra atual só sugere o KM da unidade quando a apuração ainda **não** foi finalizada. Por isso a linha "Valor sugerido pela unidade. 12 km da base" aparece, mas os campos KM TOTAL e VALOR POR KM continuam vazios e o total fica R$ 0,00.

O valor padrão de R$ 2,50 por km está cadastrado corretamente nas Configurações.

## Como vai passar a funcionar

- Sempre que o deslocamento estiver de fato em branco (tipo "Nenhum", 0 km e R$ 0,00), a etapa "Deslocamento" abre já preenchida:
  - Tipo: **Por km**
  - KM total: distância cadastrada na unidade da OS (ex.: 12 km na Casa Cruzeiro)
  - Valor por km: **R$ 2,50** (valor padrão das Configurações)
  - Quantidade de deslocamentos: **1**
  - Total calculado na hora: 1 × 12 km × R$ 2,50 = R$ 30,00
- Isso passa a valer também para OS que já tiveram a apuração de horas fechada mas nunca tiveram deslocamento definido — como a #1087. Vale para todas as OS futuras e para as ainda não revisadas.
- Se o admin já definiu deslocamento antes (por km, valor fixo, ou "Nenhum" com valor salvo), nada é sobrescrito.
- O admin continua podendo editar KM, valor e quantidade manualmente; a sugestão é só o ponto de partida.
- Unidade sem KM cadastrado continua sem sugestão de KM, mas já entra com "Por km", quantidade 1 e R$ 2,50 preenchidos para o admin digitar a distância.

## Detalhes técnicos

- `src/lib/serviceOrders/finance.ts`: em `isDisplacementUnset`, remover a condição que descarta registros com `finalized_at` — o critério passa a ser apenas `displacement_type === "none"` + `displacement_total_cents === 0` + `displacement_km_total == 0`.
- `src/components/ordens/FinalizeServiceOrderDialog.tsx`: no ramo de sugestão do efeito de hidratação, preencher `count: "1"` (hoje fica vazio) e aplicar `type: "per_km"` + `rate_input` mesmo quando a unidade não tem distância. Garantir que a sugestão só seja aplicada depois que o valor padrão por km terminar de carregar (o efeito já reage a `globalRateCents`), com fallback para `client_unit.default_displacement_rate_cents` quando a configuração global estiver ausente.
- Cálculo permanece em `computeDisplacementCents` / `effectiveDisplacementKm` — nenhuma mudança de regra (KM é por deslocamento e multiplica pela quantidade).
- Atualizar os testes de `src/lib/serviceOrders/finance.test.ts` para o novo predicado (registro vazio finalizado → sugere; registro com valores → não sugere).
- Sem migração e sem reescrita de dados de OS já finalizadas: o preenchimento acontece na tela e só é gravado quando o admin confirma.
