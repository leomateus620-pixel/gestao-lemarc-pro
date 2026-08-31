# Confirmar horários não avança para a assinatura

## Diagnóstico confirmado (OS #1156)

Consultei a OS aberta na tela (#1156, status `running`, sem ajuste do admin):

- 6 apontamentos de trabalho no histórico.
- **46 linhas** na apuração de horas, quase todas duplicatas de dois intervalos curtíssimos (19:57:07 → 19:57:42, ~35 segundos).

Causa: a comparação que evita duplicar horas trabalha em minutos inteiros. Um intervalo de menos de um minuto vira `início = fim` na comparação, então ele **nunca** é reconhecido como já apurado. A cada clique em "Confirmar horários e continuar" o sistema insere essas linhas de novo, a verificação final continua acusando pendência, e a confirmação **lança erro** em vez de seguir. Resultado: o usuário vê a mensagem de falha e o fluxo nunca chega à assinatura.

## Correção

### 1. Comparação de horários (`src/lib/serviceOrders/laborDerivation.ts`)
- Comparar intervalos com precisão de segundos e tratar intervalos de duração zero/sub-minuto como sobrepostos quando coincidem com uma linha já existente do mesmo técnico e dia.
- Ignorar na pendência automática segmentos com duração menor que 1 minuto, que não representam hora real de trabalho.
- Evitar inserir dois segmentos idênticos na mesma execução.

### 2. Confirmação da revisão (`src/lib/api/timeSessions.functions.ts`)
- `saveOrderTimeReview` deixa de lançar erro quando a reconciliação relata pendência: marca a revisão, retorna `laborPending` e permite que o fluxo continue — mesmo comportamento já usado na finalização.

### 3. Diálogo de revisão (`src/components/ordens/TimeReviewDialog.tsx`)
- Ao confirmar com sucesso, fechar a revisão e chamar `onReviewed()` sempre; se vier `laborPending`, mostrar aviso (não bloqueio).
- Garantir a passagem limpa de um diálogo para o outro, para a captura de assinatura abrir de fato após o fechamento da revisão.

### 4. Limpeza dos dados afetados (migração SQL)
- Remover linhas duplicadas da apuração (mesma OS, técnico, data, início e fim), mantendo uma de cada.
- Recalcular totais de mão de obra e o total geral das OS afetadas.

## Validação
- Na OS #1156: confirmar horários deve avançar direto para a assinatura, sem erro.
- Confirmar duas vezes seguidas não pode aumentar a quantidade de linhas nem as horas apuradas.
- Apuração da #1156 volta a refletir apenas os 6 apontamentos reais.
- Fluxo do técnico: finalizar → revisão → confirmar → assinatura → OS finalizada.
- Fluxo do admin: "Coletar assinatura" e "Substituir" seguem a mesma ordem.

## Resultado esperado
```text
Confirmar horários  →  revisão salva (idempotente)  →  captura de assinatura
```
