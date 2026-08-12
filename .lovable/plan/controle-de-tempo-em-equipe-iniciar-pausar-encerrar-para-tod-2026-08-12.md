# Controle de tempo em equipe (iniciar / pausar / encerrar para todos)

## O que foi constatado nas OS #1106 e #1107

Consultei os registros de tempo dessas duas OS. Em cada uma existe apenas **um** registro de tempo:

- OS #1106: só o Matheus (início 08:28, pausa almoço 12:00, retomada 13:58 ainda em aberto). Nenhum registro para o José Manoel Vera.
- OS #1107: só o Juan Rusch (08:47–09:41). Nenhum registro para o OMAR ALVES.

Ou seja, não é bloqueio de permissão nem falha de gravação: o segundo técnico **nunca teve tempo aberto**. Causa: na tela existem dois caminhos de início muito parecidos — um botão "Iniciar serviço para toda a equipe" (que só aparece quando a OS tem 1 ou 2 técnicos e ninguém começou) e, logo abaixo, no cartão do próprio técnico, outro botão "Iniciar serviço" que inicia **somente para ele**. O técnico usou o botão do cartão, então o colega ficou "Aguardando". Além disso:

- Com 3 técnicos ou mais não existe nenhuma opção de iniciar para a equipe.
- O início em equipe dispara chamadas em paralelo e, se uma falhar, ainda mostra "Serviço iniciado" — a falha parcial passa desapercebida.
- Pausar e Encerrar só atuam em um técnico por vez (o do seletor), sem opção de equipe.

## Como o fluxo vai funcionar

Um único bloco de ações, sempre visível, com escolha explícita de quem é afetado:

- **Iniciar**: botão principal "Iniciar para a equipe" (todos os técnicos ainda não iniciados) + ação secundária "Iniciar só o meu tempo". Vale para qualquer quantidade de técnicos.
- **Pausar**: o diálogo de pausa passa a listar os técnicos em execução com marcação múltipla, "Selecionar todos" e atalho "Só o meu tempo". Motivo/observação valem para os selecionados.
- **Retomar**: mesma seleção (todos os pausados ou apenas o próprio).
- **Encerrar**: confirmação mostrando quem será encerrado — equipe inteira ou apenas o próprio tempo.
- Qualquer técnico vinculado à OS (ou admin) pode agir pela equipe; a autorização continua no servidor e a gravação segue com credencial de serviço, então técnicos sem login vinculado também são iniciados/pausados/encerrados corretamente.
- Toda ação em lote retorna resultado por técnico: sucesso parcial aparece como aviso nomeando quem falhou, nunca como "tudo certo".

O cálculo continua por técnico (cada um com suas sessões, horas e valor/hora), então apuração de horas, PDF, relatórios e recálculo financeiro seguem como hoje — apenas passam a receber os registros dos técnicos que antes ficavam de fora.

## Correção dos dados atuais

- OS #1107: criar o tempo do OMAR ALVES espelhando o Juan (08:47–09:41), marcado como ajuste.
- OS #1106: criar o tempo do José Manoel Vera espelhando o Matheus (08:28, pausa almoço 12:00, retomada 13:58 acompanhando o Matheus).
- Nas duas OS, disparar a reconciliação das horas para que os novos tempos entrem nos totais e nos valores.

## Detalhes técnicos

- `src/lib/api/timeSessions.functions.ts`: `startWork`, `pauseWork`, `resumeWork`, `finishWork` passam a aceitar `technicianIds: string[]` (mantendo compatibilidade com `technicianId`), processando cada técnico no servidor e retornando `{ succeeded, failed: [{ technicianId, message }] }`. Reconciliação de labor e alerta de tempo em aberto rodam uma única vez ao final do lote.
- Autorização inalterada em `assertOrderTimeAccess` (admin ou técnico da OS); escrita via `getTimeSessionWriter()`.
- `ServiceOrderTimeControl.tsx`: remove o botão de início por cartão em favor da barra de ações com escopo (equipe / próprio), uma mutação única por operação e erro parcial por nome.
- `PauseServiceOrderDialog.tsx`: recebe a lista de técnicos em execução e devolve `technicianIds` além de motivo/observação.
- `_app.ordens.$id.tsx`: início/encerramento em lote passam a usar a chamada única em vez de `Promise.all` por técnico.
- Testes: cenários de lote (parcial e completo) e agregação de horas por técnico.