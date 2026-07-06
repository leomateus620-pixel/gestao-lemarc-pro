## Diagnóstico

Quando o técnico finaliza a OS, `updateServiceOrderStatus({status:"finished"})` muda o status direto para `finished`. Ao abrir essa OS, o administrador vê a rota `flow.finished`, cujo botão é **"Enviar para revisão"** e apenas dispara `mutation.mutate("review")` — pulando o `FinalizeServiceOrderDialog` (a tela de apuração, deslocamento, materiais, revisão e fechamento).

Na sequência, `flow.review` mostra **"Aprovar para cobrança"** e vai direto a `approved`, também sem passar pelo diálogo.

Ou seja: hoje o diálogo de revisão só abre quando `action.next === "finished"` (isto é, quando o próprio admin sai de `running`). Se o técnico já deixou a OS em `finished`, o admin nunca mais chega a ele — daí "a revisão não abre os campos" e a OS aparece já finalizada (anexo 3), sem chance de editar deslocamento/valores.

O backend está OK: `finalizeServiceOrder` continua sendo a chamada correta para consolidar tudo (labor entries, deslocamento, materiais, `worked_minutes`, `hour_rate`, `finished_at`, `closed_at`). Só precisamos reconduzir o admin ao diálogo.

## Correção

Em `src/routes/_app.ordens.$id.tsx`:

1. **Reabrir o diálogo de revisão para admin em `finished` e `review`**
   - Definir `adminReview = isAdmin && (order.status === "running" || order.status === "finished" || order.status === "review")`.
   - No card "Próxima ação", quando `adminReview` for verdadeiro, o botão principal chama `setFinalizeOpen(true)` (ícone `Calculator`) — em vez de disparar transição de status.
   - Ajustar o rótulo do card:
     - `running` → "Finalizar OS" (mantém).
     - `finished` → "Revisar e finalizar OS" (subtítulo: "Confira valores, adicione deslocamento e feche a OS").
     - `review` → "Revisar e finalizar OS".
   - `showActionCard` passa a considerar também admin em `finished`/`review` (hoje já é verdade, mas sem passar pelo diálogo). Nenhuma outra transição da máquina de estados é alterada.

2. **Rota `flow` intocada** — o admin não vai mais usar `finished → review → approved` pela CTA principal. `finalizeServiceOrder` continua deixando o status em `finished` após a revisão, o que é o comportamento existente para o fluxo do admin.

3. **Técnico continua igual**: `tecnicoFinalize` (status `running`) abre a assinatura + `mutate("finished")`. Card verde "OS finalizada e enviada para revisão." segue como está.

4. **Nada muda no backend, RLS, servidor, ou no `FinalizeServiceOrderDialog`**.

## Fora de escopo

- Estados `approved`/`cancelled`.
- Alterações no servidor ou nas políticas RLS.
- Fluxo do técnico após finalizar.

## Validação

- Técnico finaliza OS #X → status vai a `finished`, ele vê card "OS finalizada e enviada para revisão." (como no anexo 2).
- Admin abre a mesma OS #X: card "Próxima ação" mostra **"Revisar e finalizar OS"** → clique abre o `FinalizeServiceOrderDialog` (Apontamentos / Deslocamento / Revisão), permitindo editar valores, adicionar deslocamento e concluir. Ao confirmar, `finalizeServiceOrder` roda e a OS fica `finished` com totais preenchidos.
- OS criada e finalizada pelo próprio admin (fluxo antigo, anexo 1) continua idêntica.
