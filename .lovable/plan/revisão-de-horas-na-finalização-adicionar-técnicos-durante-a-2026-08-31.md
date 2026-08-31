# Revisão de horas na finalização + adicionar técnicos durante a OS

## 1. Tirar o campo "Motivo do ajuste"

O editor de horário (Editar/Adicionar horário) deixa de pedir texto de motivo. O registro de auditoria continua existindo: o sistema grava automaticamente um motivo padrão ("Ajuste feito na revisão de horários pela OS #NNNN"), então nada se perde no histórico, no PDF ou nos relatórios.

- `src/components/ordens/EditTimeSessionSheet.tsx`: remover o campo, o estado e a validação do motivo; enviar o motivo automático ao salvar/adicionar. Continuam apenas: técnico (ao adicionar), início, fim e motivo da pausa (quando aplicável).
- Nenhuma mudança no servidor: as funções seguem exigindo um motivo, que agora vem preenchido pelo sistema.

## 2. Revisão de horas ao finalizar a OS (garantia)

Hoje o técnico só vê a revisão quando ainda não há assinatura. Passa a ver sempre.

- `src/routes/_app.ordens.$id.tsx`: em "Finalizar OS", abrir sempre o diálogo de revisão de horários antes de qualquer outra coisa. Depois de confirmar a revisão:
  - se ainda não houver assinatura, abre a coleta de assinatura (fluxo atual);
  - se já houver assinatura, encerra os cronômetros e finaliza a OS.
- O diálogo de revisão continua igual visualmente (cronômetro ao vivo, editar e adicionar horário). A confirmação da revisão não encerra os tempos; o encerramento só acontece na finalização, como já é hoje.

## 3. Adicionar técnicos durante a OS

- Nova ação "Adicionar técnico" dentro do campo **Técnico responsável** na tela da OS, disponível para o administrador e para os técnicos já vinculados, enquanto a OS não estiver finalizada/cancelada.
- Ao confirmar, o(s) técnico(s) são acrescentados à lista existente (sem remover ninguém e sem trocar o técnico principal), passam a aparecer em "Técnico responsável", recebem a notificação de vínculo e entram no Controle de tempo com **cronômetro zerado**, contando somente a partir do momento em que iniciarem o próprio tempo — o fluxo normal de iniciar/pausar/retomar/encerrar.

### Detalhes técnicos

- `src/lib/api/serviceOrders.functions.ts`: nova `addServiceOrderTechnicians` (append). Valida que o chamador é admin (`is_admin`) ou técnico da OS (`user_is_order_technician`) e, só então, insere os vínculos com o cliente privilegiado — necessário porque a política atual de escrita em `service_order_technicians` cobre apenas admin e criador da OS. Bloqueia OS cancelada/aprovada, ignora duplicados, mantém `is_primary` do primeiro vínculo e dispara as notificações de atribuição já existentes.
- Novo componente `src/components/ordens/AddOrderTechniciansDialog.tsx` usando `listTechnicians`, com invalidação de `service-order`, `order-time-sessions` e `order-time-review`.
- Sem migração de banco: as sessões de tempo são por técnico, então quem entra depois começa em zero naturalmente.

## Validação

- Técnico finaliza OS com e sem assinatura: revisão aparece nos dois casos e o fluxo conclui sem travar.
- Editar/adicionar horário sem digitar motivo, com o histórico e a apuração recalculando.
- Adicionar técnico no meio da OS: aparece em "Técnico responsável", cronômetro em zero, inicia/pausa/encerra normalmente e as horas entram na apuração e no PDF.
- Rodar a suíte de testes existente.
