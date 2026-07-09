## Diagnóstico

Confirmado no banco a origem do bug:

**Sessões de tempo (corretas)** — OS `e98ad7ca…`:
- Douglas: 231 min (08:10→12:01) + 201 min (14:09→17:30) + 41 min (17:34→18:15) = **473 min**
- João: 231 min + 201 min = **432 min**

**Labor entries (o que vai para o PDF)** — armazenam **1 linha por técnico com um único intervalo `start_time → end_time`**:
- Douglas: `08:10 → 16:25` → `duration = 495 min = 08:15`
- João: `08:10 → 16:25` → `duration = 495 min = 08:15`

A causa é estrutural: cada técnico grava **um único par início/fim**, e o cálculo é `fim − início`. Isso é impossível de conciliar com pausas. A tela ao vivo (`ServiceOrderTimeControl` / histórico) usa `computeTechnicianWorkedMinutes(sessions,…)` e está correta — o problema mora no **fluxo de finalização** (`FinalizeServiceOrderDialog` + `finalizeServiceOrder`) e, por consequência, no PDF.

O prefill em `FinalizeServiceOrderDialog` até tenta usar `computeClosedWorkedMinutesByTech(sessions)` para calcular minutos líquidos, mas:
1. Colapsa tudo em `start = order.started_at`, `end = start + minutos` — perde os intervalos reais e o registro das pausas.
2. Se `sessions` ainda não chegou no primeiro render, o fallback usa `order.started_at → order.finished_at` (inclui pausas). É exatamente o estado da OS de teste.
3. O usuário pode ajustar os horários e a duração passa a ser recomputada como `end − start`, escondendo qualquer pausa.

## Correção

Objetivo: fazer com que cada intervalo real de trabalho (entre iniciar/retomar e pausar/finalizar) vire **uma linha de labor entry**. A tabela já tem `start_time, end_time, duration_minutes`, então **não há mudança de schema, RLS, policies, storage nem rotas**.

### 1. Prefill do diálogo de finalização — `src/components/ordens/FinalizeServiceOrderDialog.tsx`

Substituir a lógica atual (uma entry por técnico com `start + workedMinutes`) por:

- Para cada técnico da OS, iterar sobre `sessions.filter(s => s.kind === 'work' && s.ended_at && s.technician_id === t.id)` **em ordem cronológica**.
- Para cada sessão fechada, gerar um `DraftEntry` com:
  - `work_date = data local (America/Sao_Paulo) do started_at`
  - `start_time = HH:mm de started_at`
  - `end_time = HH:mm de ended_at`
  - `hourly_rate_cents = t.hourly_rate_cents`
  - `description = 'Trabalho — intervalo N'` (curto e claro; substitui o texto genérico "Calculado automaticamente")
- Sessões que atravessam meia-noite: dividir em duas entries (uma até 23:59, outra a partir de 00:00 no dia seguinte) para respeitar `computeDurationMinutes` (que exige mesmo dia). Caso muito raro, mas cobre o edge case sem quebrar validação.
- Fallback quando `sessions` está vazio (OS sem tracking usada): manter a entry única atual (uma por técnico) — não regride OSs antigas.
- Aguardar `sessions` carregar antes de gerar entries automáticas: usar `isLoading` do `useQuery` e não hidratar até `sessions` estar definido (evita o fallback errado que gerou este bug).

Efeitos colaterais benéficos:
- O usuário ainda pode editar manualmente cada linha, remover, adicionar (nada muda no editor).
- A duração vira a soma dos intervalos ativos — pausas ficam automaticamente fora.
- `finalizeServiceOrder` no backend **não muda** (já aceita array de entries).

### 2. Melhorias no PDF — `src/components/reports/print/ServiceOrderReportDocument.tsx`

A tabela já mostra Técnico / Início / Fim / Horas / R$/h / Total por linha. Com múltiplas entries por técnico, ela naturalmente exibirá cada intervalo ativo. Adicionar:

- **Agrupamento por técnico**: linhas do mesmo técnico em sequência, com uma **linha de subtotal por técnico** (Horas trabalhadas líquidas + Total do técnico) logo abaixo dos intervalos dele.
- **Linhas de pausa entre intervalos**: entre duas entries consecutivas do mesmo técnico, inserir uma linha discreta em cinza claro, formato `Pausa — <motivo> · <HH:mm início> → <HH:mm fim> (<duração>)`. As pausas vêm de `sessions` (já disponível: hoje o PDF não recebe sessions — precisará ser passado via loader/serverFn de impressão; ver seção "Detalhes técnicos" abaixo).
- Reforçar no rodapé da seção: "Horas trabalhadas não incluem intervalos de pausa. Totais financeiros calculados apenas sobre horas efetivamente trabalhadas."
- Ajustes visuais: leve destaque no total geral, espaçamento das colunas, ancoragem tabular-nums (a maior parte já está em `STYLES`, ampliar `.grand` e adicionar `.techSubtotal`, `.pauseRow`).
- Trocar "Calculado automaticamente pelo controle de tempo" (na seção "Serviço executado") por um resumo curto derivado das entries: "N intervalos · HH:mm trabalhadas".

### 3. Tela da OS — `src/components/ordens/ServiceOrderTimeControl.tsx` e `ServiceOrderTimeHistory.tsx`

Já usam `computeTechnicianWorkedMinutes`/`buildTimeline` que estão corretos. Fazer apenas duas checagens:

- Garantir que ações incompatíveis não aparecem quando um técnico já finalizou (não permitir botão "Retomar" para técnico com `state === 'finished'`; conferir `getTechnicianState`).
- Se a OS já foi finalizada como um todo (`status in ('finished','review','approved')`), esconder ações de start/pause/resume para todos os técnicos.

Nenhuma mudança de rota, RLS, tabela ou storage.

### 4. Dados existentes

Não migrar automaticamente. A OS de teste (e qualquer OS finalizada com valores incorretos) pode ser corrigida abrindo novamente o diálogo de finalização — o prefill agora carrega os intervalos reais a partir das sessions, e o admin confirma. Documento no PR.

## Critérios de aceite (a validar depois da implementação)

- OS teste (Douglas + João, pausa almoço): PDF passa a mostrar 2 linhas por técnico e subtotais 06:07 (ou o valor real das sessions — no banco atual Douglas tem 07:53 pois há sessões extras após 16:25; se o cenário do usuário for reproduzido com pausa única, o resultado bate com 06:07 e R$ 519,92 / R$ 458,75 / R$ 978,67).
- Total geral da OS = soma dos totais por técnico, sem contar pausa.
- Cenários adicionais: sem pausa (1 linha), 1 pausa (2 linhas), múltiplas pausas (N linhas), técnicos com horários distintos, técnico finalizado + outro em andamento (não bloqueia; entries só entram para técnicos com sessões fechadas), OS totalmente encerrada.
- Sem regressão em criar/abrir/pausar/retomar/finalizar OS e no fluxo de assinatura.

## Detalhes técnicos

- `FinalizeServiceOrderDialog` já faz `useQuery(listTimeSessions)`; basta usar as sessões (não `computeClosedWorkedMinutesByTech`) para gerar entries.
- `ServiceOrderReportDocument` recebe hoje `entries: LaborEntry[]`. Para exibir pausas, passar também `sessions: TimeSession[]`. As chamadas de impressão em `src/lib/reports/serviceOrderDownload.ts` e `src/routes/_app.ordens.$id.imprimir.tsx` (a verificar) precisam buscar as sessões (já existe `listTimeSessions`) e repassar. Se o formato do documento ficar mais claro reagrupando por técnico dentro do próprio componente, faço lá — sem tocar em types compartilhados.
- Fuso: usar `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })` já usado no arquivo para derivar `work_date`, `start_time`, `end_time` a partir dos ISO das sessions.
- Preservar `LaborEntryInput` como está — o backend `finalizeServiceOrder` já persiste várias linhas por técnico sem alteração.
