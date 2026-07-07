## Objetivo

Reduzir o fluxo de início de OS de 3 cliques (Despachar → Iniciar deslocamento → Iniciar serviço → e ainda um por técnico) para 1 clique único: **"Iniciar serviço"**, que já coloca a OS em `running` e dispara automaticamente o cronômetro de todos os técnicos vinculados.

Sem rota nova, sem tela nova, sem alterar controle individual, finalização, assinatura, anexos, PDF, relatórios ou apuração financeira.

## Diagnóstico do fluxo atual

- `src/routes/_app.ordens.$id.tsx` (linhas 95-107) define o objeto `flow` que hoje encadeia:
  - `pending` → botão "Despachar OS" → status `dispatched`
  - `dispatched` → botão "Iniciar deslocamento" → status `transit`
  - `transit` → botão "Iniciar serviço" → status `running` (via `updateServiceOrderStatus`)
- O botão da "Próxima ação" chama `mutation.mutate(action.next)` que só troca o status — **não** cria sessões de trabalho.
- O técnico ainda precisa abrir `ServiceOrderTimeControl` e clicar no seu próprio botão "Iniciar" para começar o cronômetro (usa `startWork` de `src/lib/api/timeSessions.functions.ts`).
- `startWork` já promove a OS para `running` quando ela está em `pending`/`dispatched`/`transit` — logo, chamar `startWork` para os técnicos vinculados resolve status + tempo em um só passo, aproveitando lógica existente.

## Mudanças

### 1. `src/routes/_app.ordens.$id.tsx` (único arquivo alterado)

- Alterar o mapa `flow` para os três status iniciais apontarem para a mesma ação visual:
  - `pending`, `dispatched`, `transit` → label "Iniciar serviço", ícone `Play`, `next: "running"`.
  - Demais entradas (`running`, `finished`, `review`, `approved`, `cancelled`) permanecem exatamente como estão.
- Adicionar helper `isStartFlow = order.status === "pending" || "dispatched" || "transit"`.
- Importar `startWork` de `@/lib/api/timeSessions.functions` e criar `startWorkFn = useServerFn(startWork)`.
- Nova mutação `startServiceMutation`:
  - Se `technicians.length === 0` → `toast.error("Vincule ao menos um técnico para iniciar o serviço.")` e retorna.
  - Para cada técnico vinculado, chama `startWorkFn({ data: { orderId, technicianId } })` em `Promise.allSettled`.
  - Ignora erros com mensagem "Já existe uma sessão de trabalho ativa" (idempotência para técnicos já ativos).
  - Se **todos** falharem por outro motivo → `toast.error` com a mensagem do primeiro erro real (não quebra a página).
  - Se pelo menos um técnico iniciou:
    - Toast: `"Serviço iniciado."` (1 técnico) ou `"Serviço iniciado para a equipe."` (2+); se houve técnicos já ativos ignorados, `"Alguns técnicos já estavam com tempo ativo."`.
    - Invalida `["service-orders"]`, `["service-order", id]`, `["order-time-sessions", id]`, `["dashboard-technician-time"]` para o `ServiceOrderTimeControl` refletir imediatamente.
  - Não chama `updateServiceOrderStatus` — o próprio `startWork` promove a OS para `running`.
- No render do card "Próxima ação":
  - Quando `isStartFlow`, o `onClick` do `PrimaryCTA` chama `startServiceMutation.mutate()` em vez de `mutation.mutate(action.next)`.
  - Label e ícone continuam vindo de `flow[order.status]` (agora todos "Iniciar serviço" / `Play`).
  - `disabled` usa `startServiceMutation.isPending`; texto "Iniciando..." enquanto pendente.
- Para os demais status (`running` → finalizar, `finished` → revisar, etc.), continua chamando `mutation.mutate(action.next)` — nenhuma alteração.

### 2. Nada mais é alterado

- `ServiceOrderTimeControl.tsx`: **não muda**. Continua mostrando os botões individuais Pausar / Retomar / Encerrar meu tempo / (Iniciar manual para técnico adicionado depois).
- `timeSessions.functions.ts`: **não muda**. `startWork`, `pauseWork`, `resumeWork`, `finishWork` intactos.
- `serviceOrders.functions.ts`: **não muda**. `updateServiceOrderStatus` continua existindo para os demais avanços de status.
- Enum de status, tipos, banco, migrations, RLS: **não muda**.
- Finalização (`handleTecnicoFinish`, `FinalizeServiceOrderDialog`), assinatura, anexos, PDF, relatórios, apuração financeira, permissões técnico/admin: **não muda**.

## Validação

- Typecheck (`tsgo --noEmit`).
- Cenário 1 técnico: OS `pending` → card mostra "Iniciar serviço" (sem "Despachar OS" / "Iniciar deslocamento") → 1 clique → OS vira `running`, cronômetro do técnico aparece rodando no controle abaixo, sem 2º clique. Pausar / Retomar / Encerrar funcionam.
- Cenário 2 técnicos: 1 clique inicia ambos; pausa/retomada individual continuam independentes.
- Cenário sem técnico: toast "Vincule ao menos um técnico…", OS permanece em `pending`, página não quebra.
- Cenário OS legada em `dispatched` ou `transit`: card já mostra "Iniciar serviço" e 1 clique promove para `running` + inicia técnicos.
- Admin/gestor: fluxo de revisão/finalização a partir de `running`/`finished`/`review` continua idêntico; técnico continua sem ver valores financeiros.

## Arquivos alterados

- `src/routes/_app.ordens.$id.tsx` (único).
