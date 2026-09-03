# OS 1124: horas do Douglas e do Sebastian não aparecem na revisão do admin

## Diagnóstico confirmado (consultas no banco)

Na OS #1124 existem 6 intervalos de trabalho registrados:

```text
19/08  DOUGLAS EDUARDO FLORES   10:29 → 12:45   137 min
19/08  SEBASTIAN MARQUXS        10:29 → 12:45   137 min
20/08  MATHEUS DOS SANTOS BEYER 08:36 → 12:05   209 min
20/08  JOSÉ MANOEL VERA         08:36 → 12:05   209 min
20/08  MATHEUS DOS SANTOS BEYER 13:28 → 18:06   278 min
20/08  JOSÉ MANOEL VERA         13:28 → 18:06   278 min
```

As 6 linhas também existem na apuração de horas (`service_order_labor_entries`, origem `session_sync`).

O problema não é perda de horas, é a **lista de técnicos da OS**: hoje a OS #1124 só tem Matheus e José vinculados como técnicos. Douglas e Sebastian trabalharam, tiveram os intervalos gravados, e depois foram **removidos da equipe** — o vínculo em `service_order_technicians` foi apagado, mas os intervalos e as horas permaneceram.

Consequência na tela de "Revisar e finalizar":
- `FinalizeServiceOrderDialog` monta as linhas percorrendo **apenas os técnicos vinculados** (`buildEntriesFromSessions` itera `techs`), então os intervalos do Douglas e do Sebastian são descartados quando a apuração é gerada do zero.
- Quando a apuração já existe, as linhas deles são carregadas, mas o seletor de técnico e o rótulo só conhecem os técnicos vinculados — a linha aparece sem nome/técnico em branco, dando a impressão de que "sumiu".
- A revisão do técnico (`TimeReviewDialog`) mostra o intervalo, mas com o nome genérico "Técnico".

Causa raiz da remoção: `setServiceOrderTechnicians` apaga todos os vínculos e recria com a nova lista, sem proteger quem já tem tempo registrado na OS.

Varredura em todas as OS: **somente a #1124** tem hoje intervalos de técnicos sem vínculo (Douglas e Sebastian). O restante está consistente.

## Correções

### 1. Nunca mais perder um técnico que já trabalhou na OS
- `setServiceOrderTechnicians`: antes de reescrever a equipe, buscar os técnicos que possuem intervalos em `service_order_time_sessions` ou linhas em `service_order_labor_entries` naquela OS. Esses IDs são preservados na nova lista (não podem ser removidos). O principal continua sendo o primeiro da lista enviada.
- Na UI de edição de equipe, os técnicos com tempo registrado ficam marcados como não removíveis, com a explicação de que já possuem horas apuradas.

### 2. A revisão do admin passa a considerar todos os técnicos com tempo na OS
- `FinalizeServiceOrderDialog`: a lista efetiva de técnicos passa a ser a união entre os técnicos vinculados e os técnicos presentes nos intervalos/linhas de apuração da OS. Assim `buildEntriesFromSessions` gera as linhas do Douglas e do Sebastian, o seletor de técnico lista todos, e o resumo por técnico mostra os quatro nomes.
- Técnico só de histórico aparece com um selo discreto ("histórico") para o admin saber que ele não está mais na equipe atual, sem alterar o layout da etapa.
- `TimeReviewDialog` e `ServiceOrderTimeHistory` usam a mesma lista ampliada, eliminando o rótulo genérico "Técnico".

### 3. Reparo dos dados da OS #1124
- Revincular Douglas e Sebastian em `service_order_technicians` (sem tocar em `is_primary` do Matheus), para que a OS volte a refletir quem realmente executou o serviço.
- Recalcular o resumo financeiro da OS para os totais somarem os quatro técnicos.

## Validação
- Abrir "Revisar e finalizar" na OS #1124: as 6 linhas aparecem com os quatro nomes; total de horas e valor coerentes.
- Editar a equipe de uma OS tentando remover um técnico com horas: a remoção é bloqueada com mensagem clara.
- Uma OS normal (equipe sem alterações) continua se comportando exatamente como hoje.
- Rodar os testes e o build de produção.

## Detalhes técnicos
- Arquivos: `src/lib/api/serviceOrders.functions.ts` (`setServiceOrderTechnicians`), `src/components/ordens/FinalizeServiceOrderDialog.tsx` (lista de técnicos e `buildEntriesFromSessions`), `src/components/ordens/TimeReviewDialog.tsx`, `src/lib/serviceOrders/technicians.ts` (helper de união técnicos + histórico), `src/lib/api/timeSessions.functions.ts` (`getOrderTimeReview` devolvendo também os técnicos de histórico).
- Sem migração de schema; apenas correção pontual de dados da OS #1124.
