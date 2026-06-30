# Revisão e finalização do módulo Colaboradores

Foco: corrigir base (rotas, persistência, valor/hora, cálculo em OS) antes de qualquer refinamento visual. Sem mocks, tudo no Supabase Cloud.

## 1. Diagnóstico do 404 após cadastro

Investigar a causa real do 404 em `/colaboradores/novo` → submit:
- Verificar o retorno de `createTechnician` em `src/lib/api/serviceOrders.functions.ts` (se devolve `row.id` válido ou objeto incompleto).
- Confirmar que `navigate({ to: "/colaboradores/$id", params: { id: row.id } })` em `_app.colaboradores.novo.tsx` recebe ID definido.
- Validar `routeTree.gen.ts` lista `/_app/colaboradores/$id` corretamente (sem conflito com `/_app/colaboradores/novo`).
- Checar se o insert no Supabase está realmente sucedendo (RLS, GRANT, payload) — pode estar retornando erro silenciosamente e ainda navegando.

Correção definitiva: garantir que a server function retorne `.select().single()`, validar `id` antes de navegar, exibir erro real se falhar e nunca redirecionar para rota inválida.

## 2. Persistência real (Supabase)

Auditar tabela `technicians` e `technician_rate_history`:
- Confirmar colunas esperadas (`hourly_rate_cents`, `hourly_rate_50_cents`, `hourly_rate_100_cents`, `pricing_notes`, `internal_notes`, `cpf`, `specialty`, `kind`, `default_availability`, `active`, `user_id`, etc.).
- Confirmar GRANTs e RLS (authenticated CRUD + service_role ALL).
- Trigger em `technicians` que insere em `technician_rate_history` apenas quando `hourly_rate_cents` (ou 50/100) mudar — preservando histórico e mantendo OS antigas com seu valor congelado.

Migração corretiva apenas se algo estiver faltando.

## 3. Server functions de Colaboradores

Em `src/lib/api/serviceOrders.functions.ts`:
- `createTechnician`: validar input com Zod, mapear todos os campos do form, `INSERT ... RETURNING *`, devolver row tipada.
- `updateTechnician`: aceitar `id` + patch parcial, NÃO zerar campos ausentes (usar update por chave existente), `RETURNING *`.
- Garantir conversão correta R$ → centavos (parse robusto de "85,00" e "85.00", nunca multiplicar duas vezes).
- Usar `requireSupabaseAuth` para gravar `created_by = userId`.

## 4. Formulário de cadastro/edição

`src/components/colaboradores/CollaboratorForm.tsx`:
- Wizard ou seções: Dados principais → Operação → Valor/hora → Acesso.
- Máscara CPF/telefone, parse seguro de moeda (centavos), `initial` para edição.
- Submit único (anti double-click), erros inline, toast de sucesso/erro real.
- Após salvar (novo): redireciona para `/colaboradores/$id` com ID retornado. Edição: redireciona para perfil.

## 5. Perfil do colaborador

`_app.colaboradores.$id.tsx`:
- Mostrar dados reais; "A definir" só quando dado for null.
- Se `hourly_rate_cents` for null, CTA destacado **"Definir valor/hora"** → `/colaboradores/$id/editar?focus=rate` (formulário rola/foca no campo).
- Botão Editar funcional levando a `/colaboradores/$id/editar`.
- Padding inferior para não ser coberto pelo bottom nav.
- Cards horizontais (estilo Lemarc Dynamic Island), contraste melhorado.

## 6. Telas auxiliares (horas e ordens)

`_app.colaboradores.$id.horas.tsx`:
- Query `service_order_labor_entries` filtrada por `technician_id`.
- Soma `duration_minutes` e `subtotal_cents`, filtros por período.
- Estado vazio claro: "Este colaborador ainda não possui apontamentos finalizados em OS."

`_app.colaboradores.$id.ordens.tsx`:
- Vínculo via `service_order_technicians` + `service_order_labor_entries` + fallback `service_orders.technician_id`. Deduplicar por `order_id`.
- Cada card: número, cliente/unidade, status, horas do colaborador, valor gerado, demais técnicos, botão "Abrir OS".

## 7. Integração com OS (cálculo correto)

`ServiceOrderWizard.tsx` e `FinalizeServiceOrderDialog.tsx`:
- Listar apenas `active = true`; mostrar pill quando `hourly_rate_cents` for null e bloquear apontamento até definir.
- Ao adicionar apontamento, pré-preencher `hourly_rate_cents` com o valor atual do técnico (congela na entrada — `frozen rate`).
- `subtotal_cents = round(duration_minutes / 60 * hourly_rate_cents)` por técnico, individualmente.
- `service_order_financials.total_labor_cents` = soma dos subtotals reais (cada técnico com seu valor).

## 8. Separação Real vs Estimado

Em `src/lib/serviceOrders/collaborators.ts` (já existe a distinção):
- Garantir que KPIs e cards mostrem **Real** como principal e **Estimado** com badge "estimado" separado, sem somar como se fosse real (já está parcialmente implementado — revisar visual).

## 9. Refinamento visual (somente após base OK)

- Bottom nav: `pb-[calc(env(safe-area-inset-bottom)+5rem)]` no AppShell do perfil.
- Cards horizontais, labels com contraste suficiente.
- CTA "Definir valor/hora" em destaque (gradiente Lemarc).
- Botão Editar com ícone + label claros.

## 10. Validação end-to-end

Playwright headless no preview com sessão Supabase injetada:
1. Criar colaborador "Teste Plano" com valor R$ 85,00 → verificar redirect para `/colaboradores/$id` (não 404) e row no Supabase.
2. Editar telefone/função/valor → confirmar update e que campos não tocados ficam intactos.
3. Criar OS, adicionar apontamento 3h30 → confirmar subtotal R$ 297,50.
4. Múltiplos técnicos com valores diferentes na mesma OS → confirmar soma individual.
5. Mudar valor/hora → confirmar entrada em `technician_rate_history`, OS antiga preserva valor antigo, nova OS usa novo.
6. Verificar telas `/horas` e `/ordens` com dados reais.
7. Deletar colaboradores de teste ao final.

Comandos:
- `npm run build`
- `eslint` focado nos arquivos do escopo
- `vitest run src/lib/serviceOrders/collaborators.test.ts`

## Detalhes técnicos

```text
Fluxo do valor/hora:
form input "85,00" → parseBRL() → 8500 (cents)
→ technicians.hourly_rate_cents = 8500
→ trigger → technician_rate_history (starts_at = now)

Em OS:
apontamento.hourly_rate_cents ← snapshot de technicians.hourly_rate_cents
subtotal_cents = round(duration_minutes / 60 * hourly_rate_cents)
financials.total_labor_cents = SUM(entries.subtotal_cents)
```

Arquivos previstos para edição:
- `src/lib/api/serviceOrders.functions.ts` (create/update technician robustos)
- `src/components/colaboradores/CollaboratorForm.tsx` (validação, máscaras, focus param)
- `src/routes/_app.colaboradores.novo.tsx` (tratamento de erro e ID)
- `src/routes/_app.colaboradores.$id.tsx` (CTA valor/hora, padding, layout horizontal)
- `src/routes/_app.colaboradores.$id.editar.tsx` (suporte a `?focus=rate`)
- `src/routes/_app.colaboradores.$id.horas.tsx` / `.ordens.tsx` (queries reais + empty states)
- `src/components/ordens/ServiceOrderWizard.tsx` / `FinalizeServiceOrderDialog.tsx` (pré-preencher rate, bloquear sem rate)
- Migração corretiva apenas se faltar coluna/trigger/grant.

## Fora do escopo

- Redesign profundo do módulo Ordens/Clientes/Relatórios.
- Import em massa de colaboradores via UI.
- Mudanças em Auth/Login.

## Entrega final

Resumo com: causa raiz do 404, rotas validadas, campos persistidos, fluxo valor/hora, cálculo em OS, arquivos alterados, validações executadas (screenshots Playwright das telas principais).
