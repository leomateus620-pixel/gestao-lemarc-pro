# Garantir que o histórico da OS sempre chegue na Apuração de horas

## O que a verificação mostrou agora

Comparei, em todas as OS, o total do histórico (registros de tempo fechados e válidos) com o total da Apuração de horas:

- Nas OS criadas depois da correção, o bloqueio indevido **não voltou a acontecer**: as OS finalizadas pelo técnico já materializam as horas normalmente.
- Sobrou **1 caso** ainda divergente sem revisão do admin: **#1125** (status Finalizada), com dois registros de 5 minutos (19/08) no histórico e **nenhuma linha** na Apuração. Nada foi materializado ali — a OS ficou de fora porque a reconciliação nunca chegou a rodar com sucesso para ela.
- As demais divergências são de OS **já ajustadas/aprovadas pelo admin** (#1145, #1143, #1134, #1133, #1130, #1117, #1113, #1112, #1107, #1106, #1100, #1099, #1098, #1097, #1096, #1095, #1094, #1093, #1092, #1091, #1088, #1087, #1085, #1084, #1083, #1082, #1080, #1078, #1077, #1074, #1073, #1072, #1059, #1058, #1056). Nessas, a diferença é esperada (ajuste manual) e **nada será alterado automaticamente**.

Ponto frágil que sobrou: a reconciliação hoje roda "na melhor das hipóteses" — se ela falha (erro de rede, permissão, corrida), o erro é engolido em silêncio e a OS fica sem horas até alguém abrir a tela de Apuração. Foi assim que a #1125 passou.

## O que será feito

1. **Reconciliação com verificação, não silenciosa**
   Ao pausar, retomar, encerrar e finalizar, a reconciliação continua não bloqueando o técnico, mas passa a **conferir o resultado**: se o histórico tem horas válidas e a Apuração continua sem elas, o sistema registra a falha em log e tenta de novo, em vez de simplesmente ignorar.

2. **Rede de segurança na leitura da Apuração**
   Ao abrir a Apuração de horas, além da reconciliação já existente, o sistema compara histórico × apuração e mostra um aviso claro ao admin quando houver horas do histórico ainda não incorporadas, com ação de "incorporar agora" — nunca mais uma diferença invisível.

3. **Verificação automatizada (para o bug não voltar)**
   Testes cobrindo exatamente os cenários que quebraram: OS Finalizada pelo técnico com trabalho em dois dias, OS com apuração ajustada pelo admin (deve permanecer intocada), sessões curtas (poucos minutos), sessões acima de 14h e virada de meia-noite (seguem exigindo ajuste manual).

4. **Correção da #1125**
   Materializar as duas linhas de 5 minutos a partir do histórico, com o valor/hora de cada técnico, e recalcular horas e totais da OS.

5. **Relatório das OS já revisadas**
   Entrego a lista com a diferença de cada uma das OS já aprovadas/ajustadas para você decidir caso a caso. Nenhuma alteração automática nelas.

O que continua protegido, sem mudança: sessões acima de 14h, sessões atravessando a meia-noite sem pausa, e o respeito total a ajustes manuais do admin, resumo financeiro finalizado e status Revisão/Aprovada/Cancelada.

## Detalhes técnicos

- `src/lib/serviceOrders/laborSync.server.ts`: `reconcileLaborFromSessions` passa a retornar também `{ pendingMinutes, failed }` em vez de só `appended`; o `catch` genérico deixa de mascarar erro de insert (retorna `failed: true` com a mensagem).
- `src/lib/api/timeSessions.functions.ts`: nos 3 pontos de chamada, uma segunda tentativa quando `failed` e `console.error` estruturado; fluxo do técnico segue sem bloqueio.
- `src/lib/api/financials.functions.ts`: expor no payload da Apuração um `laborPendingMinutes` (histórico materializável − apurado, quando não bloqueado) para a UI.
- `src/components/ordens/LaborEntriesEditor.tsx` (ou o container da Apuração): faixa de aviso + botão que chama a reconciliação sob demanda.
- `src/lib/serviceOrders/laborDerivation.test.ts`: novos casos (técnico finalizou em 2 dias, sessão de 5 min, >14h, meia-noite, apuração ajustada).
- Correção de dados da #1125 via ferramenta de dados (sem alteração de schema).
