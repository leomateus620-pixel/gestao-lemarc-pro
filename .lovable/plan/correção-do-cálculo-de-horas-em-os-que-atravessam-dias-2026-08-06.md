# Correção do cálculo de horas em OS que atravessam dias

## O que foi verificado

Consultei as sessões de tempo e os apontamentos gravados no banco. O registro de ponto em si está correto: quando o técnico pausa às 18:00 do dia 06 e retoma no dia 07, o sistema fecha a sessão do dia 06 e cria uma nova sessão no dia 07, com duração correta em cada uma.

O problema está na etapa seguinte — a conversão das sessões em "Apuração de horas" (que alimenta PDF, valores e relatórios):

- Confirmado na base: a OS 1088 tem 1.456 minutos registrados em sessões ao longo de 3 dias, mas apenas 206 minutos na apuração, sem nenhum ajuste manual de admin. Outras OS estão na mesma situação.
- Causa: a apuração é materializada **uma única vez**. Depois que ela existe, novas sessões (o trabalho do dia seguinte) nunca são incorporadas. Se alguém abriu o resumo financeiro no dia 06, as horas do dia 07 não entram.
- Segundo defeito: sessão que atravessa a meia-noite é gravada como um único apontamento no dia inicial com hora final forçada para 23:59, enquanto a duração total continua cheia — data/hora ficam incoerentes no PDF.
- Terceiro defeito: ao reconstruir a apuração depois de uma edição do técnico, a busca das tarifas por técnico não filtra pela OS atual, podendo puxar valor/hora de outra OS.

## O que será feito

1. **Reconstruir a apuração sempre que houver sessões novas**
   - Ao ler a "Apuração de horas", comparar as sessões fechadas com os apontamentos gravados e incorporar as sessões ainda não representadas (ex.: o dia seguinte), preservando tarifas, funções e descrições existentes.
   - Manter o bloqueio atual: se o admin já editou/salvou a apuração, nada é sobrescrito — as sessões novas entram como linhas adicionais para revisão, sem alterar ou remover as linhas ajustadas.
   - Recalcular os totais da OS ao pausar/retomar/encerrar o tempo, para os números ficarem coerentes sem depender de abrir o resumo financeiro.

2. **Tratar sessões que cruzam a meia-noite**
   - Dividir em um apontamento por dia (dia 1: início → 23:59; dia 2: 00:00 → fim), com as durações somando exatamente a duração real. Corrige PDF, apuração e relatórios por data.

3. **Corrigir a busca de tarifas na re-sincronização**
   - Filtrar pela OS atual ao recuperar valor/hora e função dos apontamentos existentes.

4. **Corrigir as OS já afetadas**
   - Reconciliar as OS em que sessões e apuração divergem sem ajuste manual (como a 1088), regravando apontamentos a partir das sessões e recalculando totais, valores e total geral.
   - OS já ajustadas pelo admin permanecem intactas; apenas recebem as linhas de sessões que ficaram de fora.

5. **Exibição no controle de tempo**
   - Garantir que histórico e total por técnico somem todos os dias da OS, continuando a respeitar o ajuste do admin quando existir.

## Detalhes técnicos

- `src/lib/api/financials.functions.ts`: substituir o curto-circuito `storedEntries.length > 0` por reconciliação incremental com correspondência sessão→apontamento (técnico + data + início + fim); `deriveEntriesFromSessions` passa a emitir uma linha por dia local (America/Sao_Paulo) quando a sessão cruza a meia-noite.
- `src/lib/serviceOrders/laborSync.server.ts`: adicionar `.eq("service_order_id", orderId)` na leitura de apontamentos existentes; reutilizar a mesma divisão por dia; expor helper de reconciliação.
- `src/lib/api/timeSessions.functions.ts`: chamar a reconciliação (best-effort, sem quebrar o fluxo do técnico) ao encerrar sessões.
- Reconciliação de dados das OS divergentes via ferramenta de dados (não schema).
- Testes unitários da divisão por dia e da reconciliação incremental em `src/lib/serviceOrders/`.