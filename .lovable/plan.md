# Permitir fechar OS sem deslocamento

## O problema

A opção "Sem deslocamento" já existe na etapa de Deslocamento, mas ela não "cola":

- Ao abrir a revisão, o sistema pré-preenche "Por km" com o KM da unidade e R$ 2,50 sempre que o deslocamento é considerado "não definido".
- Hoje "não definido" é exatamente `tipo = nenhum, 0 km, R$ 0,00` — ou seja, o mesmo estado de uma OS legitimamente sem deslocamento. Então, quando o admin escolhe "Sem deslocamento" e o diálogo re-hidrata (dados financeiros/sessões recarregam, ou a revisão é reaberta), a escolha volta para "Por km" com os campos preenchidos.
- Resultado prático: o admin não consegue deixar a OS sem deslocamento; e se apagar KM/valor manualmente, o botão "Ir para revisão" fica desabilitado porque o tipo continua "Por km" com valores zerados.

## Como vai passar a funcionar

- A escolha "Sem deslocamento" passa a ser respeitada: o total de deslocamento fica R$ 0,00 e o admin segue para a revisão e finaliza normalmente.
- Enquanto o diálogo está aberto, nada que o admin escolher ou digitar no passo Deslocamento é sobrescrito pela sugestão automática.
- Quando a OS é salva com "Sem deslocamento", essa decisão fica registrada: ao reabrir a revisão, a OS continua sem deslocamento, sem voltar a sugerir o KM da unidade.
- A sugestão automática (KM da unidade + R$ 2,50 + 1 deslocamento) continua igual para as OS que ainda não tiveram o deslocamento decidido.
- O cartão "Sem custo de deslocamento" ganha um texto curto reforçando que a OS pode ser fechada assim.

## Detalhes técnicos

- Migração: adicionar `displacement_decided boolean not null default false` em `service_order_financials`; marcar `true` em toda gravação vinda da revisão (`finalizeServiceOrder` em `src/lib/api/financials.functions.ts`) e fazer backfill `true` nos registros que já têm deslocamento com valor (`displacement_total_cents > 0` ou `displacement_km_total > 0` ou `displacement_type <> 'none'`), preservando a sugestão automática nas OS ainda zeradas.
- `src/lib/serviceOrders/finance.ts`: `isDisplacementUnset` retorna `false` quando `displacement_decided` é `true`. Campo adicionado em `OrderFinancials` (`src/types/financials.ts`) e no mapeamento de linhas em `financials.functions.ts`.
- `src/components/ordens/FinalizeServiceOrderDialog.tsx`: o efeito de hidratação passa a rodar apenas na transição fechado→aberto (guarda por ref), em vez de reagir a mudanças de `existing`/`sessions`/`globalRateCents`, para não sobrescrever a escolha manual. `hasAutoDisplacementSuggestion` e `missingGlobalRate` deixam de ser exibidos quando o tipo selecionado é "none".
- `stepDisplacementValid` já aceita `type === "none"` — nenhuma mudança de regra de validação.
- Teste em `src/lib/serviceOrders/finance.test.ts`: registro com `displacement_decided = true` e tipo "none" → não sugere; registro zerado e não decidido → sugere.