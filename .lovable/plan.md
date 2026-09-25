# Padronizar textos das notificações push

## O que muda

**Técnicos** — sempre que uma OS é vinculada a eles (criação da OS, troca de técnico ou técnico adicionado durante a OS):
- Título: **"Uma OS foi vinculada a você"**
- Texto: **"OS #1209 — MANUTEÇÃO ELETRICA. · MOTOR DESARMANDO"** (número, nome da OS e descrição; descrição cortada em ~120 caracteres; se não houver descrição, só número e nome)
- Ao tocar, abre a OS (sem mudança).

**Administradores** — só quando uma OS é finalizada (mantém a regra atual, sem duplicar se for direto para aprovada):
- Título: **"OS #1209 finalizada"**
- Texto: **"MANUTEÇÃO ELETRICA. · Cliente · Unidade · Técnico"**
- Ao tocar, abre a OS.

Admins não recebem aviso de vinculação, e técnicos não recebem aviso de finalização (já é assim; será conferido).

## Detalhes técnicos
- `src/lib/api/notifications.functions.ts`: `buildNotificationTitle` → "Uma OS foi vinculada a você"; `buildNotificationMessage` → `OS #N — título · descrição` (trim/truncate). O mesmo texto vale para o aviso dentro do app (sininho), para ficar coerente. Garantir que `fetchNotificationOrder` seleciona `description`.
- `src/lib/api/serviceOrders.functions.ts` (~linha 571): corpo do push de finalização passa a incluir o título da OS antes de cliente/unidade/técnico.
- Conferir que as 4 chamadas de `syncAssignmentNotificationsSafely` (criar, editar técnicos, substituir, adicionar durante a OS) disparam o push só para os técnicos novos.
- Validar com build e um envio de teste para o Leonardo com o novo formato.
