## Diagnóstico

1. **"Iniciar serviço" pede um clique por técnico.**
   `ServiceOrderTimeControl` cria uma sessão só para o técnico selecionado. Quando são 2 pessoas, o técnico tem que trocar o `select`, clicar de novo e às vezes esquece — daí a sensação de bug.

2. **Ao clicar "Finalizar serviço" acontece um erro silencioso.**
   No topo da OS, "Finalizar serviço" chama `updateServiceOrderStatus({status:'finished'})`. O servidor **exige assinatura** (`Antes de finalizar a OS, colete a assinatura do responsável…`). A `useMutation` não tem `onError`, então nada é exibido; o usuário toca em outras coisas e acaba em `/ordens` (barra inferior nova) achando que foi redirecionado por causa do "Finalizar". Também não checamos se ainda existe alguém com o cronômetro rodando.

## Correção

### 1. Iniciar serviço em lote (1–2 técnicos)

Em `src/components/ordens/ServiceOrderTimeControl.tsx`:

- Se `technicians.length <= 2` **e nenhum** técnico está com sessão `running`, mostrar um **único botão principal** "Iniciar serviço para toda a equipe" que executa `startWork` para cada técnico em paralelo (`Promise.all`, ignorando os que já estejam ativos). Toast único: "Serviço iniciado para X técnicos.".
- Se algum já iniciou, cair para os botões individuais atuais (permitir o companheiro iniciar depois).
- Se `technicians.length >= 3`, manter o fluxo atual (um botão por técnico, com o `select`).
- Mesma lógica aplicada a **retomar** quando todos estão pausados (opcional, só se ficar trivial — se não, deixar de fora deste plano).
- Nada muda no servidor (`startWork` continua por técnico).

### 2. Finalizar serviço para técnico — sem erro cego, sem redirect

Em `src/routes/_app.ordens.$id.tsx`:

- Na `useMutation` de `updateServiceOrderStatus`, adicionar `onError` com `toast.error(e.message)` em pt-BR — assim o técnico vê o motivo real ("colete a assinatura…") em vez de nada.
- Antes de disparar `mutation.mutate("finished")` no botão do técnico:
  - Se **não houver assinatura ativa nem waiver**, abrir automaticamente o diálogo de coleta de assinatura (`SignatureCaptureDialog`) em vez de chamar o backend. Após a assinatura ser salva, disparar `finished` na sequência.
  - Se ainda houver sessão de tempo em execução para algum técnico, encerrar automaticamente essas sessões (`finishWork` por técnico ativo) antes de mudar o status. Toast informativo: "Encerrando cronômetro antes de finalizar…".
- Em `onSuccess` do `status === "finished"` para técnico: **não navegar**. Continuar mostrando a mesma OS com o card "OS finalizada e enviada para revisão." (já existe). Invalidar caches: `service-order`, `service-orders`, `order-time-sessions`.
- Nada muda para o admin (ele continua usando o `FinalizeServiceOrderDialog`).

### 3. Guarda-corpo contra redirect indesejado

- Nenhum código atual navega para `/ordens` após finalizar; a percepção do usuário vem do menu inferior (que agora inclui `/ordens`). Manter `/ordens` no menu — o técnico agora precisa dele — mas garantir que o botão "Finalizar" nunca perca o contexto da OS (fica na mesma rota `/ordens/$id`).

## Fora de escopo

- Alterações no servidor `updateServiceOrderStatus` ou nas políticas RLS.
- Mudar o fluxo do admin (revisão/aprovação continua igual).

## Validação

- OS com 1 técnico + Marcio (2): botão único "Iniciar serviço para toda a equipe" cria sessões para ambos.
- OS com 3+ técnicos: botões individuais como hoje.
- Marcio clica "Finalizar serviço" sem assinatura → abre o diálogo de assinatura; após assinar, OS vai a `finished`, aparece "OS finalizada e enviada para revisão." e ele permanece em `/ordens/$id`. Nada de erro silencioso.
- Marcio clica "Finalizar serviço" com cronômetro rodando → sistema encerra a sessão, finaliza a OS e mostra o card final.
- Admin não vê mudança de comportamento.
