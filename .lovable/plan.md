# Selo "Finalizada pelo técnico" (só exibição)

## Regra exata
Vale somente para OS gravadas como `running`. Nas outras OS, nada muda.

Considera só as sessões de trabalho (`kind = work`) que têm técnico. Para cada técnico com sessão, o estado vem da regra que já existe (`getTechnicianState`).

Ordem de prioridade:
1. Algum técnico em andamento: **Em execução**. Aparece "N pausados" no rótulo menor, como hoje. Ex.: #1267, #1275.
2. Ninguém em andamento e algum pausado: **Pausada**, como hoje. Ex.: #1266, #1248.
3. Ninguém em andamento nem pausado, e pelo menos uma sessão encerrada: **Finalizada pelo técnico**. Ex.: #1246, #1272, #1274.
4. Nenhuma sessão de trabalho: **Em execução**, como hoje. Isso preserva as OS antigas iniciadas sem cronômetro.

**Técnico vinculado que nunca iniciou:** não impede o novo selo. Concordo com a proposta. Ele não tem sessão aberta e não segura tempo. Se ele bloqueasse o selo, uma OS em que o admin vinculou alguém "por via das dúvidas" ficaria para sempre "Em execução", que é o problema de hoje. Ele continua aparecendo como "Não iniciado" no cartão da equipe, e o admin decide ao finalizar. Consequência: nenhuma consulta nova aos técnicos vinculados.

**Reabrir tempo / Voltar a trabalhar:** abre uma nova sessão, então a OS volta sozinha para Em execução. Uma pausa depois disso leva a Pausada.

## O que NÃO muda
O status gravado e os seus valores possíveis, a finalização (o botão "Finalizar OS" continua disponível), a apuração de horas, o PDF, as permissões e o banco.

## Arquivos
- `src/lib/serviceOrders/displayStatus.ts`:
  - `OrderTimeSummary.key` passa a ser `"running" | "paused" | "tech_finished"`, com o novo `finishedCount`.
  - `DisplayStatusKey` ganha `"tech_finished"`.
  - `summarizeOrderTime` aplica as prioridades 1 a 4.
  - `displayFromSummary` passa a devolver o rótulo "Finalizada pelo técnico".
  - Nova constante `TECH_FINISHED_BADGE_TONE`.
  - Nova função `countTechFinishedOrders`.
  - `countPausedOrders` não muda.
- `src/lib/api/timeSessions.functions.ts` (`listRunningOrderTimeState`): só o tipo do retorno muda, porque a função já reaproveita `summarizeOrderTime`. A atualização a cada 30 s e ao voltar para a tela continua igual (`useServiceOrders.ts`).
- O selo: `ServiceOrderStatusBadge`, o mesmo arquivo do `ServiceOrderCard`, ganha o tom novo. `ServiceOrderCard` (`cardAccent`), `ServiceOrderIslandRow`, `TechnicianOrderCard`/`TechnicianOrderList` e o cabeçalho de `_app.ordens.$id.tsx` (que já usa `getOrderDisplayStatus`) passam a exibir o novo estado sem lógica própria.
- `src/routes/_app.ordens.index.tsx`:
  - novo filtro "Finalizada pelo técnico", com a mesma lógica do filtro Pausada (linha 402);
  - o filtro "Em execução" deixa de incluir essas OS.
- Contadores (`_app.ordens.index.tsx` linha 311, `_app.dashboard.tsx`, `OperationTodayCard.tsx`):
  - **"Em campo"** continua contando todas as OS `running`, porque o admin ainda precisa agir nelas;
  - o rótulo menor fica: "X em execução · Y pausadas · Z finalizadas pelo técnico";
  - "em execução" passa a ser em campo − pausadas − finalizadas pelo técnico.

## Cor
Um tom ciano/azul-claro da paleta: borda `sky-400/50`, fundo `sky-500/15`, texto `sky-200`. Ele se distingue do verde de Em execução, do âmbar de Pausada e do laranja (cor principal) de Finalizada. Acento lateral do cartão no mesmo tom.

## Testes (Vitest, `displayStatus.test.ts`)
- Um técnico: em andamento → Em execução; pausa → Pausada; retoma → Em execução; encerra → Finalizada pelo técnico; reabre → Em execução.
- Encerrado + pausado → Pausada.
- Encerrado + em andamento → Em execução.
- Encerrado + vinculado que nunca iniciou → Finalizada pelo técnico.
- OS sem sessões → Em execução.
- OS `finished`, `review`, `approved` ou `pending` com sessões encerradas → status original, sem mudança.
- `countTechFinishedOrders` e `countPausedOrders` com uma mistura de OS.
- Os 13 casos atuais continuam passando.

## Riscos
- Uma OS em que o técnico encerrou sem querer aparece como "Finalizada pelo técnico" até alguém reabrir o tempo. É o comportamento desejado, mas é bom avisar a equipe.
- Sessões criadas sem `technician_id` são ignoradas, como hoje.
- Durante o intervalo de até 30 s da atualização, o selo pode ficar defasado.

## Perguntas em aberto
1. O texto do selo é longo no celular. Usar "Finalizada pelo técnico" por extenso ou "Fin. técnico" no cartão compacto?
2. Na tela do técnico, o próprio técnico também deve ver esse selo, ou só o admin?
3. "Em campo" continua contando essas OS (proposta: sim) ou elas saem do total?

Observação: o roadmap não foi atualizado agora porque, neste modo, só o plano pode ser editado. Será incluído ao implementar.
