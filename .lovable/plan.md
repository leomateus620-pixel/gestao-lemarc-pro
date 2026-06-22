## Refator da tela `/ordens/nova` em wizard multi-etapas

Reorganizar o cadastro de OS num fluxo lateral por etapas, preservando rotas, payload, mutations e destino dos dados. Mudança puramente de UX/UI + composição de estado local.

## 5 etapas

1. **Dados iniciais** — título*, descrição, local/setor, previsão
2. **Cliente** — segmented "Selecionar existente / Cadastrar novo"; quick-create inline
3. **Técnico** — mesmo padrão da etapa 2; opção "Sem técnico definido" explícita
4. **Serviço & prioridade** — tipo em cards/chips grandes; prioridade em 4 pills com cores semânticas (baixa neutro, média laranja, alta âmbar, urgente vermelho)
5. **Revisão** — resumo em blocos + CTA "Criar ordem de serviço"

## Arquitetura de componentes

Em `src/components/ordens/wizard/`:

- `ServiceOrderWizard.tsx` — estado central (`useReducer` ou `useState` único do form), controle de step, validação por etapa, mutations existentes (`createServiceOrder`, `createClient`, `createTechnician`) reaproveitadas sem alterar payload
- `WizardStepper.tsx` — stepper horizontal (desktop) / compacto (mobile), indica atual/concluídas, clique volta a etapas válidas
- `WizardShell.tsx` — viewport com slide lateral via Framer Motion (`AnimatePresence` + `x` spring), respeita `prefers-reduced-motion`
- `StepFooter.tsx` — botões Voltar / Continuar; na etapa 5 vira "Criar OS"
- `steps/BasicInfoStep.tsx`
- `steps/ClientStep.tsx` + `InlineQuickCreateClient.tsx`
- `steps/TechnicianStep.tsx` + `InlineQuickCreateTechnician.tsx`
- `steps/ServiceTypeStep.tsx`
- `steps/ReviewStep.tsx`
- `useServiceOrderDraft.ts` — estado tipado do rascunho + validators por etapa

`src/routes/_app.ordens.nova.tsx` passa a montar apenas `<AppShell><ServiceOrderWizard /></AppShell>`. Header da página refinado (alinhamento, hierarquia do título, subtítulo "Nova OS · {usuário}").

## Estado e submit

- Mesmo shape de input do `createServiceOrder` atual (`title, description, client_id, technician_id, service_type, priority, location, scheduled_for`). Nenhuma mudança em server functions, schema, RLS, queries.
- `clientId`/`techId` resolvidos antes do submit final: se o usuário usou quick-create numa etapa, o id retornado pela mutation já fica no rascunho.
- Invalidations e navegação pós-criação iguais às atuais (`navigate /ordens/$id`).
- Rascunho mantido em memória do componente (sem localStorage por enquanto — fora do escopo declarado).

## Validação progressiva

- Etapa 1: `title.trim().length >= 3`
- Etapa 2: `clientId` selecionado **ou** quick-create concluído (id presente)
- Etapa 3: `techId` selecionado **ou** explicitamente "sem técnico"
- Etapa 4: `service_type` e `priority` definidos
- Etapa 5: revisão, mostra pendências se houver

Mensagens curtas abaixo dos campos. Botão "Continuar" desabilitado quando inválido.

## Visual

- Tokens já existentes (navy/orange/cyan); sem hex hard-coded.
- Inputs com altura confortável, foco em `ring-primary/40`, hover sutil.
- Cards de tipo de serviço com ícone + label, estado selecionado com borda primary e leve elevação.
- Prioridade em pills coloridas tonais.
- Stepper: trilha `white/10`, segmentos preenchidos `primary`, círculo atual com pulso suave.
- Transição lateral 220ms spring; mobile reduz amplitude.

## Fora do escopo

- Server functions, schema, RLS, payload, rotas
- Lógica de mutations (`createServiceOrder/Client/Technician`)
- Persistência em localStorage
- `AppShell` global (só ajuste local do título)

## Validação final

- Build/typecheck
- Playwright: percorrer as 5 etapas em desktop e mobile, validar criação real e redirecionamento para `/ordens/$id`
- Conferir que filtros/listagem em `/ordens` continuam recebendo a nova OS
