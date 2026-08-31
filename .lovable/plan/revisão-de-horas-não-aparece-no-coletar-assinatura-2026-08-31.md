# Revisão de horas não aparece no "Coletar assinatura"

## O que eu confirmei no código

1. Em `src/components/ordens/signature/SignatureBlock.tsx` o botão só abre a revisão quando
   o usuário é **técnico com login vinculado ao cadastro do colaborador e vinculado à OS**:
   qualquer outro caso (admin, ou técnico sem `user_id` no cadastro) vai direto para a
   tela de assinatura. Testando como admin, a revisão nunca aparece.
2. Quando a OS já tem assinatura, o cartão mostra apenas **Ver / Substituir**, e
   "Substituir" abre a assinatura direto — sem passar pela revisão.
3. No servidor (`src/lib/api/timeSessions.functions.ts`), `getOrderTimeReview` e
   `saveOrderTimeReview` exigem que quem chama seja um técnico ativo com `user_id`
   vinculado e alocado na OS. Ou seja, mesmo se a tela abrisse para o admin, ela
   retornaria "Perfil de técnico não encontrado".
4. `saveOrderTimeReview` marca como revisadas apenas as sessões do próprio técnico que
   chamou, e recusa quando ele não tem nenhuma sessão — mesmo que a equipe tenha horas.

Resumo: a revisão existe e funciona, mas está fechada a um único perfil e a revisão nunca é
exigida — o que explica as duas OS testadas.

## Correção proposta

### Quem passa pela revisão

- **Admin** e **técnico da OS** passam pela revisão antes da assinatura, incluindo o
  fluxo "Substituir assinatura" do admin.
- A revisão é exigida quando houver horas da OS ainda não revisadas (ou tempo novo depois
  da última revisão). Se tudo já está revisado, o clique vai direto para a assinatura,
  sem etapa extra.
- Se a OS não tem nenhuma sessão de trabalho registrada, o botão segue direto para a
  assinatura (não travar OS sem apontamento).

### O que a tela mostra

- Lista de todos os intervalos da OS agrupados por técnico, com total por técnico e total
  geral (como já está hoje, sem redesenho).
- Admin edita qualquer intervalo; técnico da OS edita os intervalos da OS (com motivo),
  mantendo exclusão só para admin.
- Intervalos em andamento são encerrados no momento da confirmação, como hoje.
- Confirmar marca "Revisado pelo técnico" nos apontamentos e reconcilia a apuração.

## Detalhes técnicos

**`src/lib/api/timeSessions.functions.ts`**
- `getOrderTimeReview`: autorizar por `assertOrderTimeAccess` (admin **ou**
  `user_is_order_technician`). Retornar `sessions` da OS, `currentTechnicianId` (pode ser
  `null` para admin), `isAdmin`, e o estado da revisão (`time_review_completed_at`,
  quantas sessões pendentes de revisão).
- `saveOrderTimeReview`: mesma autorização. Deixar de exigir sessões do próprio técnico:
  fechar todos os intervalos abertos da OS no instante da confirmação, marcar
  `technician_reviewed_at/by` em todas as sessões de trabalho da OS, gravar
  `time_review_completed_at/by` em `service_orders` e reconciliar com o writer de serviço
  (`getTimeSessionWriter`), como já faz hoje. Sem sessão nenhuma → retorno `{ ok: true,
  skipped: true }` em vez de erro.
- Nenhuma migração nova: as colunas de revisão já existem.

**`src/components/ordens/signature/SignatureBlock.tsx`**
- Trocar o gate `isAssignedTechnician` por "pode revisar" (admin ou técnico da OS) e
  aplicar também no botão "Substituir".
- Consultar `getOrderTimeReview` (query leve) para saber se a revisão está pendente; se
  não estiver, abrir a assinatura direto.

**`src/components/ordens/TimeReviewDialog.tsx`**
- Permitir "Editar" conforme a permissão retornada pelo servidor (admin: todos;
  técnico da OS: intervalos da OS), mantendo o layout atual.
- Corrigir o aviso de acessibilidade do diálogo (`DialogDescription`) que já aparece no
  console.

**`src/routes/_app.ordens.$id.tsx`**
- Manter o `TimeReviewDialog` do fluxo do técnico e alinhá-lo à mesma regra de pendência,
  para não pedir revisão duas vezes.

**Validação**
- Testes em `src/lib/serviceOrders/laborDerivation.test.ts` para: revisão marcando todas as
  sessões da OS, intervalo aberto encerrado na confirmação, idempotência (revisar duas
  vezes não duplica apontamentos).
- Verificação no preview: abrir uma OS com horas e clicar em "Coletar assinatura" como
  admin e como técnico, confirmar que a revisão abre, que a apuração recebe os minutos e
  que o selo "Revisado pelo técnico" aparece na apuração do admin.
