# Correção definitiva das horas "fantasma" nas OS

## O que está acontecendo (confirmado nos dados)

Na OS #1087 o João Gabriel Klein tem **uma única sessão de tempo aberta de 03/08 14:04 até 06/08 14:58** (4.374 min). Quando um técnico encerra o serviço "para a equipe", a sessão do colega é fechada com o horário do encerramento — ou seja, ela atravessa vários dias sem pausas.

Ao abrir a OS, o sistema fatia sessões que cruzam a meia-noite em uma linha por dia. Uma sessão de 3 dias gera exatamente as linhas que você viu: `04/08 00:00–23:59 = 24:00`, `05/08 00:00–23:59 = 24:00`, `06/08 00:00–14:58 = 14:58 → R$ 1.122,50`.

Duas falhas se somam:

1. **Sessões multi-dia sem pausa** (colega não é fechado no mesmo horário do técnico que encerrou) viram blocos de 24 horas.
2. **A tela de leitura grava dados.** A "Apuração de horas" faz um acréscimo automático: qualquer segmento de sessão que não bata exatamente (técnico + data + entrada/saída) com uma linha já existente é **inserido** como novo apontamento — mesmo que já exista uma linha do mesmo técnico no mesmo dia cobrindo o mesmo período, e mesmo com a OS já finalizada e enviada para cobrança. Foi por isso que as horas "brotaram dias depois" (as linhas da #1087 foram criadas em 11/08 e as da #1085 em 12/08, sem ninguém editar nada).

OS afetadas hoje: **#1085, #1087, #1058, #1078** (linhas infladas e/ou duplicadas sobrepostas). Além delas existem sessões longas em aberto que ainda podem gerar o mesmo problema: **#1059, #1074, #1083, #1084, #1090, #1100**.

## Correções

### 1. Leitura não grava mais nada em OS fechada
A apuração passa a ser somente leitura para OS em `finished` / `review` / `approved` / `cancelled` ou já finalizada financeiramente. Nada é inserido automaticamente depois que o admin revisa e envia para cobrança.

### 2. Acréscimo automático passa a respeitar sobreposição
Enquanto a OS está em andamento, um segmento de sessão só é acrescentado se **não houver sobreposição de horário** com nenhuma linha existente do mesmo técnico naquele dia (hoje a comparação é exata, por isso duplica). Isso elimina a duplicação vista na #1078.

### 3. Sessões suspeitas nunca viram horas automáticas
Sessão de trabalho com duração acima de um limite operacional (14h) ou que atravesse mais de um dia sem pausa deixa de ser materializada automaticamente. Ela aparece na apuração como pendência ("sessão longa — precisa de ajuste do admin"), para o admin corrigir o horário real. Nenhum bloco de 00:00–23:59 é gerado.

### 4. Bloqueio ao finalizar
Ao finalizar a apuração, a OS é marcada como consolidada (trava de ajuste), garantindo que nada seja reescrito depois.

### 5. Correção na origem
Quando um técnico pausa/encerra para a equipe, a sessão de cada colega é fechada com o mesmo instante — e uma sessão que já cruzou a meia-noite sem pausa é fechada no fim do expediente do próprio dia, em vez de acumular dias. Assim o problema não se cria mais.

### 6. Limpeza das OS afetadas
- #1087 e #1085: remover os blocos de 24:00 e os segmentos derivados da sessão em aberto, mantendo os apontamentos reais espelhados dos colegas; recalcular horas, valores e totais.
- #1078 e #1058: remover as linhas duplicadas sobrepostas, mantendo a versão revisada pelo admin.
- Ajustar as sessões multi-dia dessas OS para os horários reais, e revisar as sessões longas de #1059, #1074, #1083, #1084, #1090, #1100.
- Recalcular `service_order_financials` e os totais exibidos na OS, no PDF e nos relatórios.

## Detalhes técnicos

- `src/lib/api/financials.functions.ts`: `getOrderFinancials` deixa de inserir linhas quando a OS está em estado terminal / `finalized_at` preenchido; o append restante usa detecção de sobreposição e ignora sessões suspeitas.
- `src/lib/serviceOrders/laborDerivation.ts`: novo helper `overlapsExisting` + `isSuspiciousSession` (limite de 14h / mais de um dia sem pausa); `findMissingSegments` passa a usar sobreposição em vez de chave exata.
- `src/lib/serviceOrders/laborSync.server.ts`: `reconcileLaborFromSessions` aplica os mesmos filtros e não roda em OS finalizada.
- `src/lib/api/timeSessions.functions.ts` / `timeSessionWrite.server.ts`: fechamento em equipe grava o mesmo instante para todos e evita sessões que atravessam dias.
- `src/components/ordens/LaborEntriesEditor.tsx`: aviso de "sessão longa pendente de ajuste".
- Testes em `laborDerivation.test.ts` cobrindo: sessão de 3 dias não gera 24:00, segmento sobreposto não duplica, OS finalizada não recebe append.
- Correção de dados via SQL nas OS listadas, com recálculo dos financeiros.
