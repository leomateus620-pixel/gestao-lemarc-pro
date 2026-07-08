## Objetivo

1. Fazer o botão **Editar** no perfil do colaborador realmente permitir editar todos os campos (dados, operação, valor/hora e vínculo com usuário), corrigindo bugs de unificação.
2. Remover o card "PENDÊNCIA DE CADASTRO — DEFINIR VALOR/HORA" (anexo 3). O fluxo de definir valor/hora e vincular usuário passa a acontecer só pelo botão **Editar** (anexo 1).
3. Criar os usuários de acesso para **Douglas Flores** (`floresdouglas321@gmail.com`) e **Juan Husch** (`jar-1983@hotmail.com`), com papel `tecnico` (idêntico ao Marcio), e vinculá-los aos respectivos registros em `public.technicians`.

Nada do fluxo atual de OS, tempo, pausa, finalização, assinatura, PDF, relatórios ou financeiro é tocado. Técnicos continuam sem ver valores financeiros.

---

## Diagnóstico

- Rota `/colaboradores/$id/editar` já existe e usa `CollaboratorForm`, que cobre Dados / Operação / Valor/hora / Acesso / Revisão. O botão Editar funciona, mas há dois bugs que quebram a percepção de "não permite editar":
  - **Bug A — desvincula usuário ao salvar**: `updateTechnician` sempre chama `resolveAccessEmail` porque o form envia `access_email` mesmo quando vazio. Se o campo está em branco, `user_id` é sobrescrito para `null`, apagando o vínculo (ex.: editar o Marcio hoje desloga ele do painel técnico).
  - **Bug B — histórico de rate disparado à toa**: `technician_rate_history` recebe um insert em toda edição, mesmo quando o valor/hora não mudou, porque a comparação usa `data.hourly_rate_cents` (que pode vir `undefined`) contra `priorRate`.
- Card de pendência de valor/hora hoje está em `src/routes/_app.colaboradores.$id.tsx` (linhas 134-162) e aponta para a rota separada `/colaboradores/$id/precificacao`. Vai ser removido.
- Douglas Flores e Juan Husch existem em `public.technicians` sem `user_id`. Marcio (`kind='tecnico'`, `user_roles.role='tecnico'`) é o modelo.

---

## Mudanças

### 1. Corrigir `updateTechnician` (`src/lib/api/serviceOrders.functions.ts`)

- Só resolver/aplicar `access_email` quando o campo vier **realmente presente e diferente** do vínculo atual. Regra:
  - `access_email === undefined` → não mexe em `user_id`.
  - `access_email === ""` / `null` → só desvincula (`user_id = null`) se antes existia vínculo e o admin explicitamente limpou o campo.
  - String preenchida → resolve via `profiles`; se não achar, erro amigável (comportamento atual).
- Ajustar comparação de valor/hora: só gravar `technician_rate_history` quando pelo menos um dos três centavos vier definido e diferente do valor anterior (usar `hasOwnProperty` no `values`).
- Manter fallback legado intacto.

### 2. Consolidar edição no botão "Editar"

- `src/routes/_app.colaboradores.$id.tsx`:
  - Remover o card "PENDÊNCIA DE CADASTRO — DEFINIR VALOR/HORA".
  - Se `rateUndefined`, mostrar um chip discreto ao lado do nome ("Valor/hora pendente") apenas como sinalização visual, sem CTA duplicado.
  - Adicionar uma coluna no card do topo para o "Usuário vinculado" ficar visível de forma óbvia.
- `src/components/colaboradores/CollaboratorForm.tsx`:
  - Se `initial.hourly_rate_cents == null` e o usuário abrir Editar sem `focus`, iniciar direto na etapa Valor/hora — atende a intenção do "Definir agora" agora que o atalho separado foi removido.
  - Na etapa Acesso, mostrar o vínculo atual (nome/e-mail do usuário) e um botão "Remover vínculo" que limpa o campo. Sem esse botão, campo vazio = sem alteração (bug A).
- Rota `/colaboradores/$id/precificacao` continua existindo e funcional (link "Editar precificação" no painel de Precificação segue apontando para ela — não quebra nada). Só o card de pendência sai da UI principal.

### 3. Criar usuários para Douglas e Juan

Via um script one-shot no sandbox usando `SUPABASE_SERVICE_ROLE_KEY` + `supabase.auth.admin.createUser`, seguido de uma migração idempotente:

- Passo A (script): `createUser({ email, email_confirm: true, password: <senha aleatória temporária> })` para os dois e-mails. Se o e-mail já existir, apenas recupera o `id`.
- Passo B (migração SQL): para cada `user_id` retornado:
  - Upsert em `public.profiles` (`user_id`, `email`, `full_name = 'Douglas Flores' | 'Juan Husch'`).
  - Insert em `public.user_roles` (`role = 'tecnico'`) com `ON CONFLICT DO NOTHING`.
  - `UPDATE public.technicians SET user_id = <novo>, kind = COALESCE(kind, 'tecnico') WHERE id = <id fixo do técnico>`.
- Enviar por chat as **senhas temporárias geradas** para o admin repassar; o técnico pode trocar depois em /login (reset por e-mail).

Nada de política nova: as RLS existentes já cobrem `technicians`, `profiles`, `user_roles`.

---

## Validação

- Editar Marcio, salvar sem tocar em nada → `user_id` continua igual, sem novo insert em `technician_rate_history`.
- Editar Douglas, definir valor/hora e salvar → aparece em "Valor/hora", pendência some do card do topo.
- Perfil do Douglas e do Juan mostram "Usuário vinculado" com o e-mail correto após execução do script.
- Login com os e-mails novos entra como técnico (sem acesso a valores financeiros), enxerga apenas as OS atribuídas.
- Fluxos de OS (criação, tempo, pausa, retomada, finalização, assinatura, anexos, PDF, relatórios, revisão financeira) permanecem intactos — nenhum arquivo desses módulos é tocado.

---

## Arquivos alterados

- `src/lib/api/serviceOrders.functions.ts` (correção de `updateTechnician`).
- `src/routes/_app.colaboradores.$id.tsx` (remoção do card de pendência, chip de status).
- `src/components/colaboradores/CollaboratorForm.tsx` (etapa Acesso com vínculo atual + remover, foco inicial em Valor/hora quando pendente).
- Migração SQL (profiles + user_roles + link em technicians para os dois novos usuários).
- Script one-shot server-side (não versionado) para criar os usuários no Auth.
