# Correção definitiva: revisão de horas antes da assinatura

## Objetivo
Garantir que, ao clicar em **Coletar assinatura** ou **Substituir assinatura**, o técnico ou administrador veja primeiro a revisão dos horários da OS. A captura da assinatura somente poderá abrir após a confirmação bem-sucedida dessa revisão.

## Diagnóstico confirmado
- `SignatureBlock.tsx` consulta `reviewRequired` e abre diretamente a assinatura quando os apontamentos já aparecem como revisados ou não existem pendências. Isso contradiz o fluxo solicitado, no qual a revisão deve ser apresentada em toda tentativa de assinatura.
- A tela possui outros caminhos que instanciam `SignatureCaptureDialog` diretamente, especialmente na revisão administrativa, permitindo contornar a revisão de horas.
- A permissão visual do técnico depende de uma comparação local entre `technicians.user_id` e o login. Esse vínculo pode impedir a abertura do diálogo antes mesmo de o servidor validar que o usuário é técnico da OS.

## Implementação por arquivo

### `src/components/ordens/signature/SignatureBlock.tsx`
- Remover a decisão baseada em `reviewRequired` do clique de assinatura.
- Fazer **Coletar assinatura** e **Substituir** abrirem sempre `TimeReviewDialog` como primeira etapa.
- Não abrir `SignatureCaptureDialog` durante carregamento, erro ou cancelamento da revisão.
- Abrir a captura somente pelo callback de sucesso `onReviewed`.
- Retirar a dependência do vínculo local `user_id` para decidir o fluxo; a autorização continuará sendo validada no servidor.

### `src/components/ordens/TimeReviewDialog.tsx`
- Manter a revisão visível mesmo quando os horários já tenham sido revisados anteriormente, exibindo os registros atuais para uma nova conferência.
- Impedir avanço enquanto os horários estiverem carregando, enquanto houver erro ou enquanto a confirmação estiver sendo salva.
- Após editar um horário, atualizar a lista antes da confirmação para que o técnico valide os valores efetivamente persistidos.
- Fechar o diálogo e chamar `onReviewed` somente após a confirmação, encerramento de intervalos abertos e reconciliação terem concluído sem erro.
- Em falha, permanecer na revisão, mostrar erro e nunca abrir a assinatura.

### `src/components/ordens/FinalizeServiceOrderDialog.tsx`
- Substituir a abertura direta da captura de assinatura pelo mesmo encadeamento obrigatório: revisão de horas → confirmação → assinatura.
- Reutilizar `TimeReviewDialog` com os técnicos da OS, evitando uma rota administrativa que contorne a revisão.

### `src/routes/_app.ordens.$id.tsx`
- Consolidar o fluxo técnico de finalização com o fluxo do bloco de assinatura para evitar dois estados/diálogos concorrentes.
- Garantir que finalizar a OS sem assinatura também conduza primeiro à revisão e só depois à captura.
- Preservar o encerramento e a materialização segura das sessões antes da mudança de status.

### `src/lib/api/timeSessions.functions.ts`
- Manter a autorização no servidor para administrador ou técnico vinculado à OS.
- Tratar a confirmação como operação idempotente: uma nova conferência pode atualizar a marca de revisão sem duplicar sessões ou horas.
- Retornar sucesso somente depois que sessões abertas forem encerradas, registros forem marcados como revisados e a apuração for reconciliada.
- Propagar falhas para bloquear o avanço à assinatura.

## Validação
- Testar com login de técnico em uma OS com sessões pendentes: o primeiro modal deve ser **Revise os horários antes da assinatura**.
- Testar com horários já revisados: a revisão deve aparecer novamente antes da assinatura.
- Testar uma OS com sessão aberta: confirmar deve encerrá-la, recalcular a apuração e só então abrir a assinatura.
- Testar erro de carregamento e erro ao confirmar: a assinatura não pode aparecer nem o fluxo travar; deve ser possível tentar novamente ou voltar.
- Testar cancelamento da revisão: deve retornar à OS sem abrir a assinatura.
- Testar administrador nos botões **Coletar assinatura** e **Substituir** e na revisão final: todos devem respeitar a mesma ordem.
- Confirmar no navegador que nunca há dois diálogos sobrepostos e que os totais exibidos na revisão correspondem aos horários persistidos.

## Resultado esperado
```text
Clique em assinatura
        ↓
Revisão dos horários da equipe
        ↓
Confirmação e reconciliação concluídas
        ↓
Captura da assinatura
```
