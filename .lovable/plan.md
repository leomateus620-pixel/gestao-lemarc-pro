# Equipe técnica da OS: adicionar técnicos e iniciar horas individuais

## 0. Revisão atual (confirmada)
- HEAD local: `068504a` "Work in progress" (19/10), sobre `ed5531a` "Upgrade visual do login". Esse commit só mexe em `package.json`, `previewAuthStorage.ts` (gerado) e `routeTree.gen.ts` (gerado). Nada muda as premissas.
- Confirmado no código:
  - `ORDER_SELECT` projeta os técnicos (principal e `assigned_technicians`) só com `id, full_name, role, hourly_rate_cents`. **Não vem `user_id`.**
  - `ServiceOrderTimeControl` (l.44) procura `t.user_id === user.id`. Hoje isso nunca encontra o técnico logado, então "Apenas o meu tempo" não funciona. **Bug real**, corrigido na Fase 1.
  - `resolveScope` com seleção vazia devolve a equipe toda.
  - `startableIds` inclui `idle` e `finished` (l.236).
  - `addServiceOrderTechnicians` bloqueia só `cancelled`.

## Fases
1. Mapeamento e correção mínima: projetar `user_id` (só esse campo) nos técnicos do `ORDER_SELECT`. Testes que fixam o comportamento atual (fixture A/B).
2. Operação atômica no servidor, com migration aditiva.
3. Card "Equipe técnica da OS", diálogo e ações individuais, incluindo "Iniciar minhas horas".
4. Apuração: reconciliação incremental, fallbacks, finalização aberta durante o trabalho da equipe nova.
5. PDF (impressão e download), caches, regressão completa e verificação em computador e celular.

## Fase 2 — Servidor e persistência

### Migration (só aditiva)
```sql
CREATE TABLE public.service_order_team_requests (
  request_key text PRIMARY KEY,           -- gerada no navegador por intenção (UUID)
  service_order_id uuid NOT NULL REFERENCES public.service_orders(id),
  actor_user_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('link','link_and_start','start_own')),
  technician_ids uuid[] NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_order_team_requests TO authenticated;
GRANT ALL ON public.service_order_team_requests TO service_role;
ALTER TABLE public.service_order_team_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads" ON public.service_order_team_requests
  FOR SELECT TO authenticated USING (public.is_admin());
-- sem INSERT/UPDATE/DELETE para clientes; só via RPC
ALTER TABLE public.service_order_time_sessions ADD COLUMN request_key text;
CREATE UNIQUE INDEX IF NOT EXISTS sots_request_key_tech_uq
  ON public.service_order_time_sessions (request_key, technician_id) WHERE request_key IS NOT NULL;
```
Mais duas funções `SECURITY DEFINER`, com `SET search_path = public`. Revogar `EXECUTE` de `PUBLIC`/`anon` e conceder só a `authenticated`.

### `team_link_technicians(_order_id, _technician_ids uuid[], _start boolean, _request_key text)`
Tudo numa transação:
1. Se `request_key` já existe, devolve o `result` gravado. Não grava nada de novo.
2. Rejeita sem gravar quando: `is_admin()` é falso, `_technician_ids` está vazio, ou algum técnico está inativo ou não existe.
3. `SELECT ... FOR UPDATE` na OS. Isso trava a OS contra um encerramento concorrente. Regras por status:
   - `cancelled`: rejeita.
   - `_start` só com `running`.
   - `finished`, `review` e `approved` aceitam só `_start=false`, para manter a revisão admin atual.
4. Grava o vínculo com `INSERT ... ON CONFLICT DO NOTHING`. Nunca altera `is_primary` nem vínculos existentes.
5. Se `_start`: usa um único `now()` para o lote. Para cada técnico sem sessão aberta, insere `kind='work', source=<valor existente aceito pela check>, request_key`. Se já houver sessão aberta, devolve "já em andamento" e não cria outra; o índice parcial atual garante isso. Não grava `duration_minutes`.
6. Grava o resultado (`added`, `already_linked`, `started`, `already_running`) em `service_order_team_requests` e devolve.

Qualquer erro desfaz o vínculo e o início juntos.

### `team_start_own(_order_id, _request_key)`
- O técnico é resolvido no servidor: `technicians.user_id = auth.uid()` e vínculo com a OS. Nada vem do navegador.
- A OS precisa estar `running` (trava com `FOR UPDATE`).
- Se já há sessão aberta (aberta pelo admin ou em início simultâneo), devolve essa sessão. As duas chamadas convergem para a mesma sessão.
- O retorno depois de encerrado é uma nova chave e uma nova sessão, sempre por ação deliberada.

### Server functions (`serviceOrders.functions.ts` / `timeSessions.functions.ts`)
- `linkOrderTechnicians` e `startOwnWork` chamam as RPCs via `context.supabase` (o RPC valida o chamador).
- Notificação de atribuição depois do commit, só para `added` (a equipe anterior não é avisada de novo). Uma falha na notificação é registrada e não desfaz nada.
- `addServiceOrderTechnicians` continua igual por compatibilidade.

### Pausar, retomar e encerrar
- As ações novas sempre mandam `technicianIds` explícitos.
- Novo flag `requireExplicitScope`: com ele, `resolveScope` rejeita seleção vazia. Os comandos atuais da equipe continuam como estão.

## Fase 3 — Card e diálogo
- **Card "Equipe técnica da OS"** em `_app.ordens.$id.tsx`, logo após o resumo e perto do controle de tempo. Novo componente `OrderTeamCard.tsx`.
  - Cada linha mostra nome, função, estado (Ativo, Em pausa, Aguardando início, Encerrado) e horas individuais, usando o ticker compartilhado.
  - "Vinculado em" só para admin, e só quando houver `assigned_at`. Datas antigas desconhecidas não são inferidas. Para isso, `assigned_at` entra na projeção.
- **Admin:**
  - Botão "Adicionar técnico" abre o `AddOrderTechniciansDialog` evoluído: busca, multi-seleção de ativos, já vinculados marcados e desabilitados, carregamento, erro, lista vazia e bloqueio de duplo clique. A chave da requisição fica fixa enquanto o diálogo está aberto.
  - Rodapé com "Vincular técnico" e "Vincular e iniciar agora" (este só quando a OS está `running`, incluindo pausada).
  - OS `pending`, `dispatched` ou `transit`: só vincular. O "Iniciar serviço" original não muda.
  - OS `finished`, `review`, `approved` ou `cancelled`: sem botão de cronômetro no card.
  - Por linha: Iniciar, Pausar (com o `PauseServiceOrderDialog` existente), Retomar e Encerrar, sempre com o escopo daquele técnico.
- **Técnico:**
  - Se tem usuário vinculado e a OS está `running`, aparece "Iniciar minhas horas" quando não há sessão aberta.
  - Com sessão aberta: cronômetro, Pausar e Encerrar minhas horas.
  - "Encerrar minhas horas" não finaliza a OS. Vale também para OS com técnico único.
- **Técnico sem usuário:** só o admin opera. Não é criada conta.
- **Ações de equipe** em `ServiceOrderTimeControl`:
  - "Iniciar para a equipe" passa a usar só `idle`, tirando `finished`.
  - Retomar encerrados fica por linha.
  - Antes de agir, um diálogo de confirmação lista quem será atingido quando houver pausados ou encerrados.
- Trocar técnicos nunca encerra ninguém. Quem ainda está trabalhando aparece com "Encerrar" explícito.

## Fase 4 — Apuração
- Só acrescenta vínculos e sessões. Não usa `setServiceOrderTechnicians` nem sincronização destrutiva.
- Depois de encerrar ou pausar, `reconcileLaborFromSessions` roda incremental. Ele mantém ajustes do admin, travas de revisão e finalização, e sessões suspeitas.
- Se a reconciliação falhar, a OS fica marcada como pendente e a tela mostra isso. Nunca há sucesso silencioso.
- `buildEntriesFromSessions` no `FinalizeServiceOrderDialog`:
  - Técnico vinculado sem sessão não recebe o intervalo início global → fim. Aparece como "Sem horas lançadas".
  - O fallback legado continua só para OS sem nenhuma sessão em toda a equipe, como hoje.
- Finalização aberta enquanto há cronômetros abertos:
  - Aviso com a lista de quem ainda está aberto.
  - Ao atualizar, períodos novos entram no rascunho como linhas novas, sem sobrescrever linhas já editadas.
  - Finalizar com sessões abertas continua passando pelo `closeOpenWorkSessions` atual, com confirmação explícita.
- Centavos inteiros, arredondamento e precedência de tarifas continuam como estão (`finance.ts`).

## Fase 5 — PDF, caches e regressão
- PDF: impressão (`_app.ordens.$id.imprimir.tsx` + `ServiceOrderReportDocument.tsx`) e download (`serviceOrderDownload.ts`) leem os mesmos lançamentos e totais gravados. Sem cálculo paralelo.
  - Vínculo com zero trabalho não gera linha de cobrança.
  - Assinatura, materiais, deslocamentos, anexos e visual não mudam.
- Caches invalidados (as chaves reais serão conferidas na Fase 1): `service-order`, `service-orders`, `order-time-sessions`, `running-order-time-state`, `dashboard-technician-time`, `order-history-technicians`, `order-financials`, `order-labor-override`, `order-time-review`, `technicians`.
  - Se a resposta se perder, a nova tentativa usa a mesma chave e recebe o resultado gravado.
  - A tela só confirma sucesso com resposta do servidor.
  - Falha de rede não toca na sessão de login.

## Testes (Vitest, sem escrita em produção)
- Funções puras extraídas: escopo, `startable`, derivação de entradas, merge de rascunho e totais. Mais testes da RPC simulados com um repositório em memória.
- Cobrem todos os casos da especificação:
  - OS comum; A/B encerrados enquanto C/D entram; A ainda trabalhando quando C entra.
  - Vínculo sem início conta zero; vinculado às 9h e iniciado às 10h15 conta de 10h15; C às 10h15 e D às 11h.
  - Admin e técnico iniciando ao mesmo tempo; técnico único; técnico sem usuário.
  - Pausa e retomada; reinício da equipe que não pega A/B; mesmo técnico voltando.
  - Duplo clique, nova tentativa e concorrência; falha entre vínculo e início desfaz tudo.
  - Ajustes do admin preservados; OS encerrada durante a operação; não-admin ou técnico inativo rejeitado.
  - Falha de reconciliação vira pendência; finalização aberta antes do fim dos novos tempos; impressão igual ao download.
- **Fixture America/Sao_Paulo:**
  - A e B: dia 1, 08–12 e 13–17; dia 2, 08–10 (10h cada).
  - C e D: dia 2, vinculados e iniciados às 10h, até 12h, pausa, 13–17 (6h cada).
  - Tarifas: A 100, B 120, C 90, D 110 R$/h.
  - Esperado: A R$ 1.000, B R$ 1.200, C R$ 540, D R$ 660. Total 32h, 1.920 min, R$ 3.400.
  - A adição de C e D não altera os lançamentos de A/B.
- Também rodar build, `tsgo` e lint, separando falhas antigas (o teste antigo de Leitos Aramados). Verificar no navegador em computador e celular, e gerar um PDF com vários técnicos e datas.
- A RPC real só será exercida numa OS de teste criada e removida depois. Se não for possível, isso será informado.

## Riscos
- O check de `source`/`end_reason` em `service_order_time_sessions` precisa aceitar o valor usado. Será lido antes da migration; não será criado valor novo se não for preciso.
- Tirar `finished` de "Iniciar para a equipe" muda um hábito atual. A mitigação é o botão por linha.
- O RPC duplica parte da lógica de `startWork`. Será mantido pequeno, com testes de paridade.
- Vínculos antigos não têm `assigned_at` confiável. Nesses casos, "Vinculado em" fica oculto.

## Perguntas em aberto
1. "Vinculado em" fica só para admin, ou o técnico também vê?
2. Retomar um técnico encerrado: admin e o próprio técnico, ou só admin?
3. Finalizar com cronômetros da equipe nova abertos: bloquear, ou permitir com confirmação (o plano propõe confirmar e fechar no horário do servidor)?
4. Notificação para técnico vinculado e já iniciado pelo admin: mesmo texto "Uma OS foi vinculada a você", ou acrescentar "seu tempo já está contando"?
5. Na tela do técnico, o card mostra só a própria linha ou a equipe inteira (só leitura)?
