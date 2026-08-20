# OS #1088 — horas dos dias 12 a 14/08 fora da apuração

## O que aconteceu (verificado no banco)

A OS #1088 tem 30 registros de tempo, indo de 04/08 até 14/08. A apuração de horas tem apenas 22 linhas, parando em 12/08 07:41–07:54 — exatamente o que você viu na tela.

Três causas, todas confirmadas:

1. **A OS já está "Finalizada"**. Ao abrir a apuração, o sistema trava a materialização automática em OS finalizadas/em revisão (proteção criada para as "horas fantasma"). Resultado: tudo o que foi registrado depois que a apuração existia — 12/08 tarde, 13/08 e 14/08 — nunca entrou.
2. **JOSÉ MANOEL VERA ficou com o cronômetro rodando** de 12/08 15:10 até 14/08 13:52 (46h47 num único registro). Registros acima de 14h ou que atravessam a virada do dia são propositalmente ignorados na materialização automática, porque somariam horas irreais.
3. **Matheus tem um registro ainda aberto** (14/08 13:57, sem fim), depois do "Serviço finalizado". Registro aberto nunca vira hora apurada.

Complemento observado na sua segunda imagem: as linhas do Matheus estão com R$ 0,00/hora (valor/hora não cadastrado no período), então as horas dele existem mas não somam valor.

## O que será feito

### 1. Botão de revisão das horas pendentes (todas as OS)

No card "Apuração de horas", quando existirem registros de tempo ainda não representados na apuração, aparece um aviso com a contagem e um botão **"Revisar horas pendentes"**:

- Lista os registros pendentes (técnico, dia, início, fim, duração), separando:
  - **Prontos para incluir**: registros normais fechados → entram como novas linhas com o valor/hora vigente do técnico.
  - **Precisam de ajuste**: registros longos demais / que atravessam dias / ainda abertos → o admin corrige início e fim ali mesmo (ou descarta) antes de incluir.
- A inclusão é explícita (nada entra sozinho), então as proteções contra horas fantasma continuam valendo, inclusive em OS finalizada.
- Após incluir, os totais de mão de obra, valores, total geral, PDF e relatórios são recalculados na hora.

### 2. Aviso de tempo em aberto após finalização

Se houver registro de tempo aberto numa OS já finalizada, o card mostra alerta e permite encerrar o registro na data/hora informada pelo admin (mesma trilha de auditoria já usada nos ajustes).

### 3. Correção dos dados da OS #1088

- Encerrar o registro aberto do Matheus (14/08 13:57) — nada de horas extras inventadas.
- Reescrever o registro esticado do JOSÉ (12/08 15:10 → 14/08 13:52) espelhando os turnos reais do Matheus: 12/08 15:10–19:01, 13/08 07:45–12:07, 13/08 13:24–19:45, 14/08 07:57–13:51.
- Incluir na apuração as horas de 12/08 (tarde), 13/08 e 14/08 dos dois técnicos e recalcular totais e valores.
- Corrigir o valor/hora das linhas do Matheus para o valor cadastrado dele, para as horas deixarem de sair R$ 0,00.

## Detalhes técnicos

- `src/lib/api/financials.functions.ts`: nova server fn `listPendingLaborSessions(orderId)` (compara `service_order_time_sessions` fechadas com `service_order_labor_entries` via `splitSessionsByDay` + `findMissingSegments`/`overlapsExisting`) e `applyPendingLaborSessions(orderId, segments[])` que insere as linhas escolhidas (`entry_source: 'admin_review'`) e recalcula totais. A leitura (`getOrderFinancials`) continua sem gravar nada.
- `src/lib/serviceOrders/laborDerivation.ts`: expor a classificação `pendente pronto` vs `pendente suspeito` (limite `MAX_SESSION_MINUTES`, virada de dia, sessão aberta) reaproveitando os helpers atuais.
- UI: novo `PendingLaborSessionsDialog.tsx` acionado de `LaborEntriesEditor.tsx` / `FinalizeServiceOrderDialog.tsx`; invalida `["order-financials", id]` e as queries de relatórios.
- Encerramento de sessão aberta pelo admin via `timeSessionWrite.server.ts` (já roda server-side, fora do RLS do técnico), gravando `adjusted_by`/`adjustment_reason`.
- Correção da #1088 por ferramenta de dados (sem mudança de schema), respeitando o trigger `prevent_terminal_order_labor_sync`.
- Testes unitários da classificação de pendências em `src/lib/serviceOrders/laborDerivation.test.ts`.
