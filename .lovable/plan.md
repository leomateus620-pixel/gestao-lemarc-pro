## Diagnóstico

**1. Horas fictícias (08:06 · R$ 445,50)**
Em `FinalizeServiceOrderDialog.tsx` (hidratação, linha ~152):
```ts
end_time: fallbackEnd > fallbackStart ? fallbackEnd : "17:00",
```
Quando a OS é aberta e finalizada no mesmo minuto, `started_at ≈ finished_at`, então `fallbackEnd == fallbackStart` e o código inventa `"17:00"` como saída. Resultado: entrada 08:54 · saída 17:00 → 8h06 fictícias e R$ 445,50 falsos, sem qualquer aviso ao usuário.

**2. Texto sobreposto no CTA "Finalizar" (mobile)**
No card "Próxima ação" (`_app.ordens.$id.tsx`, ~232-253), quando `action.next === "finished"`:
- o `<h2>` mostra `action.label` ("Finalizar serviço")
- o botão mostra "Finalizar OS (apuração)"

Preciso investigar o `PrimaryCTA` para confirmar se a sobreposição visual do print vem de `line-height`/`text-truncate` ou de duplicação de nó — nas outras transições o mesmo componente renderiza normalmente. Ajuste vai ser textual + garantir que o CTA suporte rótulo mais longo em telas estreitas.

**3. Botão de PDF individual não aparece na lista de Ordens**
O botão "PDF OS" foi adicionado em `ServiceOrderCard.tsx`, mas o menu `/ordens` renderiza `ServiceOrderIslandRow.tsx` (islands agrupadas por período). Por isso o botão nunca aparece na tela que o usuário abre. Nada foi adicionado ao componente correto.

---

## Plano de correções (somente UI/fluxo, sem mexer em schema)

### 1. Corrigir cálculo de horas fictícias
Arquivo: `src/components/ordens/FinalizeServiceOrderDialog.tsx`

- Remover o fallback `"17:00"`. Quando não houver `finished_at` real ou quando `fallbackEnd <= fallbackStart`, manter `end_time` **igual** ao `start_time` (duração 0) em vez de inventar horário.
- Aplicar a mesma regra em `addEntry` (hoje força "08:00"/"17:00" fixos): usar o horário atual do dispositivo como sugestão inicial e deixar duração 0 até o técnico editar.
- Reforçar validação existente `stepEntriesValid` (já exige `duration_minutes > 0`) e mostrar aviso amigável quando duração for 0: *"Ajuste entrada e saída — a OS foi aberta e finalizada no mesmo instante."*
- Nenhum impacto em dados salvos: apenas remove sugestão inventada; nada é gravado sem o usuário revisar.

### 2. Corrigir o CTA "Finalizar" sobreposto
Arquivos: `src/routes/_app.ordens.$id.tsx` e o `PrimaryCTA` que ele usa.

- Ler o componente `PrimaryCTA` (dentro de `_app.ordens.$id.tsx`) para confirmar a causa da sobreposição no mobile.
- Unificar rótulo: passar a chamar o botão de `"Finalizar OS"` (sem "(apuração)") e manter o subtítulo `<h2>Finalizar serviço</h2>` da seção. Assim o rótulo cabe em uma linha e reduz o risco visual.
- Se a inspeção mostrar que `PrimaryCTA` fixa altura ou usa `truncate`, ajustar para `whitespace-nowrap` + padding coerente e `min-h` em vez de `h`.
- Sem mudar a ação — continua abrindo `FinalizeServiceOrderDialog`.

### 3. Botão "PDF OS" na lista de Ordens (padrão relatório gerencial)
Arquivo: `src/components/ordens/ServiceOrderIslandRow.tsx`

- Criar um pequeno `OrderPdfButton` local (mesma lógica do que já existe em `ServiceOrderCard.tsx`: `useServerFn(getOrderFinancials)` → `downloadServiceOrderReportPdf`), com `stopPropagation` para não expandir a row ao clicar.
- Mostrar apenas para `status === "finished" || "approved"`.
- Posicionar:
  - **Mobile**: substituir o `PriorityPill` na linha compacta quando a OS estiver encerrada (era o pedido original — usar o slot da "Média"). OS não encerradas continuam mostrando prioridade normalmente.
  - **Desktop**: substituir o `PriorityPill` na grade compacta pelo mesmo botão nas mesmas condições.
  - **Expandido**: adicionar um `ActionLink`-equivalente "Baixar PDF" ao lado de "Imprimir PDF" / "Gerar relatório" (também só para encerradas). Não precisa de rota nova.
- Reaproveitar `downloadServiceOrderReportPdf` e `buildServiceOrderReportFilename` existentes (mesmo layout Lemarc do relatório gerencial, mas por OS). Nada muda em `serviceOrderDownload.ts`, `financials.functions.ts`, `routeTree.gen.ts` ou schema.

### Fora de escopo
- Migrações Supabase, edge functions, mocks.
- Reescrever `ServiceOrderReportDocument.tsx` ou `managerialDownload.ts`.
- Alterar rotas (`routeTree.gen.ts` continua sem mudança).

## Validação
- Reabrir OS #1016 aberta/fechada no mesmo minuto → confirmar que entrada = saída, duração 00:00, subtotal R$ 0,00 e aviso pedindo ajuste.
- Fluxo running → finished no mobile → verificar CTA sem sobreposição.
- Na lista `/ordens`: OS finalizadas mostram botão "PDF OS" no slot da prioridade, clique baixa PDF sem expandir a row. OS abertas seguem com o pill de prioridade.
- Rodar `bunx tsgo --noEmit` nos arquivos alterados.
