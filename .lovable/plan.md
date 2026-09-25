# Corrigir "Adicionar técnico" na apuração de horas

## O que acontece hoje
Na janela "Adicionar técnico à OS", ao tocar num técnico, o sistema tenta gravá-lo na equipe da OS no mesmo instante. Se essa gravação falhar (por exemplo, OS já aprovada, ou erro de permissão), o técnico não entra na lista e o aviso de erro pode ficar escondido atrás da janela — parece que "não deixa selecionar".

A causa exata ainda não foi confirmada; o primeiro passo é reproduzir.

## Passos
1. Reproduzir no navegador como admin, abrindo "Revisar e finalizar" numa OS e tocando num técnico da lista; registrar o erro real (mensagem do servidor ou clique bloqueado pela janela de trás).
2. Corrigir conforme a causa:
   - Tocar no técnico passa a adicioná-lo imediatamente na apuração (linha de horário aparece na hora), sem depender de gravação prévia.
   - A inclusão na equipe da OS é gravada junto com a finalização (e continua aceita para OS finalizadas aguardando aprovação).
   - Se a janela de trás estiver bloqueando o clique, ajustar para que a janela de adicionar fique por cima e clicável.
   - Mostrar o erro dentro da própria janela, visível, quando algo falhar.
3. Mostrar estado de carregamento no técnico tocado e evitar cliques duplos.
4. Validar o fluxo completo: adicionar técnico já cadastrado, cadastrar novo, lançar horas, finalizar e conferir que ele aparece na OS e no PDF.

## Detalhes técnicos
- `AddTechnicianToLaborDialog.tsx`: `finish` chama `addServiceOrderTechnicians` antes de `onAdded`; qualquer throw impede a seleção. Mudar para `onAdded` imediato + persistência na finalização (ou tolerante a status `finished`).
- `addServiceOrderTechnicians` rejeita status `approved`/`cancelled`; revisar para o fluxo de apuração do admin.
- Diálogo aninhado dentro de `DialogContent` do `FinalizeServiceOrderDialog`; verificar `pointer-events`/z-index do portal.
