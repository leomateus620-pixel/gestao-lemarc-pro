# Ação de finalização em destaque e fluxo de fechamento sem etapas visuais

## 1. "Finalizar OS" na horizontal, abaixo do card da instalação (desktop)

Hoje o card "Próxima ação" fica numa coluna lateral de 20rem ao lado do resumo da OS. Ele passa a ser uma barra horizontal de largura total, logo abaixo do card do serviço:

```text
+--------------------------------------------------+
|  OS #1088 · INSTALAÇÃO ELETRICA ...              |
|  cliente / unidade / técnico / local             |
+--------------------------------------------------+
|  PRÓXIMA AÇÃO   Finalizar OS                     |
|  Apure horas, deslocamento e feche a OS.  [ FINALIZAR OS ] |
+--------------------------------------------------+
```

- Nova classe `lemarc-os-action-bar` em `src/styles.css`: borda laranja, mesmo acabamento do card atual, conteúdo em coluna no celular e em linha única no desktop (texto à esquerda, botão à direita com largura automática, altura confortável).
- O resumo da OS volta a ocupar a largura total (sem a grade de 2 colunas e sem o comportamento "sticky" lateral).
- No celular o comportamento continua o mesmo de hoje: bloco empilhado com botão de largura total.

## 2. Sem "Iniciar/Retomar serviço" depois que o técnico finaliza

Quando a OS estiver em Finalizada, Em revisão, Aprovada ou Cancelada, o card "Controle de tempo da OS" fica somente para leitura:

- Some a barra de ações (iniciar equipe, retomar equipe, pausar, encerrar) e o bloco "Apenas o meu tempo".
- Continuam visíveis: total trabalhado, selo de estado, aviso de horas ajustadas, lista de técnicos com horas e o histórico.
- O admin segue editando horários pela "Apuração de horas" (inclusive depois de finalizada) — nada muda nessa parte.
- A barra de ações volta a aparecer se a OS for reaberta para um status ativo.

## 3. Fim das duas etapas visuais após a apuração

Ao salvar a apuração, a OS passa direto para "Aprovada para cobrança" (com data de aprovação e fechamento), então:

- Desaparecem os dois botões seguintes: "Enviar para revisão" e "Aprovar para cobrança".
- A barra de próxima ação só aparece quando há ação real: iniciar serviço (OS não iniciada), finalizar pelo técnico ou revisar/finalizar pelo admin.
- Depois de finalizada, o admin continua com "Editar apuração", "Revisar e finalizar OS" (reabre o mesmo diálogo) e "Gerar relatório"; qualquer edição recalcula horas, valores, PDF e relatórios como já ocorre hoje.

## Detalhes técnicos

- `src/lib/api/financials.functions.ts` (`finalizeServiceOrder`): status `approved`, gravando `finished_at`, `approved_at` e `closed_at`; recálculos existentes mantidos.
- `src/routes/_app.ordens.$id.tsx`: mover o `<aside>` para uma seção `lemarc-os-action-bar` renderizada após a `section` do resumo; `showActionCard` deixa de considerar as transições `finished → review` e `review → approved`; a linha do tempo e o resumo financeiro seguem iguais.
- `src/components/ordens/ServiceOrderTimeControl.tsx`: flag `readOnly` derivada do status terminal da OS que oculta apenas os controles de ação.
- `src/styles.css`: nova barra horizontal; remoção do `sticky` da coluna lateral.
