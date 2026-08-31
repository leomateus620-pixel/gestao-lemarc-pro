# Apuração de horas ignorando o histórico após o técnico finalizar

## O que a verificação mostrou (OS #1124)

Consultei os registros no banco:

- Histórico (registros de tempo): 19/08 10:29→12:45 (Douglas e Sebastian, 137 min cada) e 20/08 08:36→12:05 + 13:28→18:06 (Matheus e José, 209 + 278 min cada). Total 1.248 min — todos fechados, sem nada suspeito.
- Apuração de horas: apenas as duas linhas de 19/08 (274 min), gravadas em 19/08 às 17:55.
- A OS está com status "Finalizada" (técnico finalizou em 20/08 18:07), mas **sem** revisão/apuração do admin (nenhum ajuste manual, nenhum fechamento financeiro).

Causa confirmada: existe um bloqueio criado para impedir as "horas fantasma" que trata `Finalizada` como se fosse "já revisada pelo admin". Como o técnico encerra a OS antes do admin revisar, todo tempo registrado depois da primeira materialização (aqui: o dia 20/08 inteiro) nunca entra na apuração. O bloqueio existe em três lugares: na leitura da apuração, na reconciliação e num gatilho do banco.

Isso não é só a 1124. Com sessões legítimas (mesmo dia, abaixo do limite de 14h) e status Finalizada sem revisão do admin, estão faltando horas em: **#1124, #1128, #1129, #1132, #1135, #1138, #1141, #1142** — várias com zero horas apuradas apesar de ter histórico completo.

## O que será feito

1. **Separar "técnico finalizou" de "admin revisou"**
   O bloqueio passa a valer apenas quando o admin realmente mexeu: apuração editada manualmente, resumo financeiro finalizado, ou OS em Revisão/Aprovada/Cancelada. Só o status "Finalizada" (ação do técnico) deixa de travar a incorporação das horas.
   Continua valendo tudo que protege contra horas fantasma: sessões acima de 14h ou que atravessam a meia-noite sem pausa seguem exigindo ajuste manual, e nada existente é sobrescrito ou apagado — as horas que faltam entram como linhas novas.

2. **Alinhar o gatilho do banco**
   O gatilho que rejeita gravação automática passa a bloquear apenas OS revisadas/aprovadas/canceladas ou com resumo financeiro finalizado, deixando passar a OS apenas finalizada pelo técnico.

3. **Recalcular no fim do trabalho, não só ao abrir a tela**
   Ao encerrar o tempo (individual ou da equipe), a reconciliação roda e os totais da OS já ficam corretos, sem depender de alguém abrir a Apuração de horas.

4. **Corrigir as OS já afetadas**
   Reconciliar as 8 OS acima: gravar as linhas de apuração que faltam a partir do histórico (respeitando valor/hora de cada técnico) e recalcular horas, valor e total geral. Te entrego a lista do antes/depois.

5. **Relatório das OS já revisadas com divergência**
   Existem também OS já ajustadas/aprovadas pelo admin (#1059, #1078, #1092, #1093, #1095, #1106, #1113, #1117, #1143, #1145) onde histórico e apuração divergem. Essas **não** serão alteradas automaticamente — te mostro a lista com a diferença de cada uma para você decidir caso a caso.

## Detalhes técnicos

- `src/lib/api/financials.functions.ts`: `isLocked` deixa de incluir `finished`; passa a ser `finalized_at || labor_entries_adjusted_at || status ∈ (review, approved, cancelled)`. Caminho de append (`findMissingSegments` + insert) inalterado.
- `src/lib/serviceOrders/laborSync.server.ts`: mesma regra em `syncLaborEntriesFromSessions` e `reconcileLaborFromSessions`.
- Migração: recriar `prevent_terminal_order_labor_sync` sem `'finished'` na lista de status bloqueados.
- `src/lib/api/timeSessions.functions.ts`: garantir chamada de `reconcileLaborFromSessions` após encerrar/pausar (best-effort, sem quebrar o fluxo do técnico).
- Testes em `src/lib/serviceOrders/laborDerivation.test.ts`: OS finalizada pelo técnico com sessões de dois dias → todas as linhas materializadas; OS com apuração ajustada pelo admin → nada alterado.
- Correção de dados das 8 OS via ferramenta de dados (sem alterar schema).
