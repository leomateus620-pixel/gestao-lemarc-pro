# Corrigir o campo "Motivo do ajuste" que se apaga sozinho

## O que está acontecendo

O diálogo de revisão de horas tem um cronômetro que atualiza a cada 1 segundo. A cada atualização, a lista de técnicos entregue ao diálogo "Editar horário" é recriada, e o formulário interpreta isso como uma reabertura: ele reinicia os campos, apagando o texto do motivo (e podendo reverter início/fim digitados). Por isso o texto some enquanto o usuário digita, tanto no desktop quanto no mobile.

## Correção

- Em `src/components/ordens/EditTimeSessionSheet.tsx`: fazer a reinicialização dos campos acontecer apenas quando o diálogo realmente abre ou quando muda a sessão editada, e não a cada atualização do cronômetro. A lista de técnicos deixa de ser gatilho de reinício; ela passa a ser usada apenas para definir o técnico inicial quando ainda não há um selecionado.
- Em `src/components/ordens/TimeReviewDialog.tsx` e `src/components/ordens/ServiceOrderTimeControl.tsx`: estabilizar a lista de técnicos passada ao diálogo (memoizada), para que o tique do cronômetro não gere um novo objeto a cada segundo.

Nada de visual muda: mesmo layout, mesmos textos, mesmas validações e auditoria.

## Validação

- Abrir "Editar horário" e "Adicionar horário" com uma sessão em andamento (cronômetro rodando) e digitar o motivo por mais de 10 segundos sem perder o texto.
- Confirmar que salvar continua recalculando apuração, totais e PDF.
- Rodar os testes existentes.
