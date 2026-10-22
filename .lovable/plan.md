# Técnico age sobre colegas da mesma OS

## O que já existe (lido no código)
- `resolveScope` (timeSessions.functions.ts l.299): ids pedidos precisam estar vinculados à OS (`service_order_technicians` + técnico principal); senão "Técnico não vinculado a esta OS.". Com `requireExplicitScope`, vazio é rejeitado.
- `startWork` / `pauseWork` / `resumeWork` / `finishWork` chamam `assertOrderTimeAccess` (admin OU `user_is_order_technician`) e gravam `created_by = context.userId` nas sessões novas.
- `startWork` com técnico encerrado já abre uma sessão nova ("Voltar a trabalhar" usa esse caminho).
- **Lacunas encontradas:** (a) `resolveScope` NÃO confere se o técnico alvo está ativo; (b) `startWork`/`resumeWork` não recusam OS fechada (finished/review/approved/cancelled) no servidor — só a tela esconde; (c) a pausa/encerramento gravam o ator em `adjusted_by`? Só no fechamento automático; pausa/encerramento manuais serão conferidos e, se não gravam o ator, passam a gravar em `metadata.actor_user_id` (sem migration).

## 1. Ações por linha nos colegas (OrderTeamCard)
- `teamRowActions`: remover a regra `!isAdmin && !isOwnRow → []`. Técnico da OS recebe nas linhas dos colegas as mesmas ações do admin: Iniciar, Pausar, Retomar, Encerrar, Voltar a trabalhar. Continua tudo só com OS `running`.
- Técnico não vinculado à OS: nenhuma ação (novo parâmetro `isOrderTechnician`).
- Ação em outra pessoa pede confirmação curta inline (mesmo padrão do "Confirmar encerramento"): "Voltar a trabalhar para José?", "Pausar José?", "Encerrar José?", "Iniciar para José?". Na própria linha, comportamento igual ao de hoje.
- Na linha do colega o rótulo usa a forma neutra ("Iniciar", "Pausar", "Retomar", "Reabrir tempo" → passa a ser "Voltar a trabalhar" também, para ficar igual ao pedido; "Encerrar").
- "Iniciar minhas horas" (própria linha) continua usando `team_start_own`, sem mudança.

## 2. Botão "Voltar a trabalhar com a equipe" (ServiceOrderTimeControl)
- Aparece quando há pelo menos um técnico encerrado ou pausado e a OS está `running` (admin e técnico da OS).
- Abre um diálogo novo `ResumeTeamDialog` listando encerrados e pausados, cada um com caixa marcada; o usuário pode desmarcar. Botão confirmar desabilitado com zero marcados.
- Ao confirmar: pausados → `resumeWork({ technicianIds, requireExplicitScope: true })`; encerrados → `startWork({ technicianIds, requireExplicitScope: true })`. Em andamento e nunca iniciados não aparecem.
- "Retomar a equipe (N)" atual é substituído por esse botão quando houver encerrados; se só houver pausados, mantém o fluxo atual também com confirmação de lista (mesmo diálogo).
- Nunca reinício automático: "Iniciar para a equipe" continua só para quem nunca iniciou.

## 3. Servidor
- Todas as ações novas enviam `technicianIds` explícitos + `requireExplicitScope: true`.
- `resolveScope` passa a recusar técnico inativo ("Técnico inativo.") — leitura de `technicians.active`.
- `startWork`, `resumeWork`, `pauseWork`, `finishWork` passam a recusar OS fora de `running` quando vêm do card da equipe (`requireExplicitScope`), preservando o caminho legado que coloca OS pending/dispatched/transit em `running` ao iniciar.
- Ator registrado: `created_by` nas sessões novas (já existe); pausa/encerramento gravam `metadata.actor_user_id` se hoje não registram ninguém.
- Extrair a validação pura para `src/lib/serviceOrders/teamScope.ts` (`validateTeamScope({ requested, assigned, activeIds })`) para poder testar sem banco.
- Sem migration, sem mudança de RLS, sem escrita no banco durante a validação.

## 4. Sem regressão
- Admin: mesmas ações e rótulos de hoje (só ganha a confirmação ao agir em outra pessoa? Não: admin fica igual, sem confirmação extra).
- Selos derivados (`summarizeOrderTime`) não mudam; voltam sozinhos a Em execução / Pausada / Finalizada pelo técnico conforme as sessões.
- Apuração, revisão, PDF, `team_link_technicians`, `team_start_own` inalterados.

## Testes (Vitest)
- `teamActions.test.ts`: técnico vê Pausar/Encerrar em colega em andamento, Retomar/Encerrar em pausado, Voltar a trabalhar em encerrado, Iniciar em nunca iniciado; técnico não vinculado → nenhuma ação; admin inalterado (todos os casos atuais); OS não-running → nada.
- `teamScope.test.ts`: vazio rejeitado; alvo não vinculado rejeitado; alvo inativo rejeitado; seleção parcial devolve só os marcados.
- Novo `resumeTeamSelection` (puro): separa marcados em `resumeIds` (pausados) e `restartIds` (encerrados); desmarcados ficam de fora; em andamento/idle nunca entram.
- `displayStatus.test.ts`: sequência #1267 — os dois encerrados → Finalizada pelo técnico; técnico volta José → Em execução; pausa José com Matheus encerrado → Pausada; encerra → Finalizada pelo técnico.
- Os testes atuais continuam passando (exceto a falha antiga de Leitos Aramados).

## Arquivos
- `src/lib/serviceOrders/teamActions.ts` (+ teste)
- `src/lib/serviceOrders/teamScope.ts` (novo, + teste)
- `src/components/ordens/OrderTeamCard.tsx`
- `src/components/ordens/ResumeTeamDialog.tsx` (novo)
- `src/components/ordens/ServiceOrderTimeControl.tsx`
- `src/routes/_app.ordens.$id.tsx` (passar `isOrderTechnician`, roteamento das ações de colega)
- `src/lib/api/timeSessions.functions.ts` (`resolveScope`, guarda de status)
- `src/lib/serviceOrders/displayStatus.test.ts`, `AGENTS.md` (substituir a regra do card: técnico da OS age em todas as linhas), `roadmap.md`

## Riscos
- Um técnico pode pausar/encerrar um colega por engano; a confirmação reduz, e o ator fica registrado.
- Duplo toque no diálogo: o servidor já pula quem está em andamento ("Já estava com tempo em andamento"), então não abre duas sessões; não é idempotente por chave como `team_start_own`.
- Notificação: agir sobre colega não envia aviso (hoje também não).
- Concorrência real técnico×técnico não será testada no banco (regra de não escrever em produção).

## Perguntas em aberto
1. O admin também deve ver a confirmação curta ao agir sobre outra pessoa, ou fica como hoje (sem)? Proposta: como hoje.
2. Na linha do colega encerrado, rótulo "Voltar a trabalhar" (proposta) ou manter "Reabrir tempo"?
3. Avisar o colega por notificação quando outro técnico pausa/encerra/retoma o tempo dele? Proposta: não, nesta etapa.
4. Recusar técnico inativo como alvo — confirma? (hoje não é recusado.)
