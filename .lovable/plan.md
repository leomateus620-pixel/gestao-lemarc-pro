## Diagnóstico

O anexo de Materiais (PDF) só é mesclado ao PDF final quando o download é feito pela rota **`/ordens/:id/imprimir`** — ela é a única que carrega os anexos e passa `materials` para `downloadServiceOrderReportPdf`.

Os outros dois botões "Baixar PDF" da OS **não** passam `materials`:

- `src/components/ordens/ServiceOrderIslandRow.tsx` (hook `useOrderPdfDownload`, linha ~817)
- `src/components/app/ServiceOrderCard.tsx` (linha ~335)

Nesses caminhos `input.materials` fica `undefined`, o ramo `if (materials.length === 0)` executa `doc.save(...)` e o PDF sai só com a primeira página — exatamente o comportamento relatado.

Correção deve ser **na origem**, não só nesta OS: centralizar o carregamento dos anexos para que qualquer call site inclua automaticamente as páginas dos PDFs de materiais.

## Plano

1. **Centralizar o fetch dos materiais**
   - Em `src/lib/reports/serviceOrderDownload.ts`, aceitar também `orderId` (opcional) no `Input`.
   - Antes de decidir mesclar, se `materials` não veio e `orderId` está presente, chamar o server fn `listServiceOrderMaterialAttachments({ data: { orderId } })` e usar os `signed_url` retornados.
   - Envolver em try/catch: usuários não-admin recebem 403 (a função exige admin) e devem seguir com o fluxo atual sem materiais — sem toast de erro, sem quebrar download.

2. **Atualizar os call sites que faltavam**
   - `useOrderPdfDownload` em `ServiceOrderIslandRow.tsx`: passar `orderId: order.id` para o download.
   - Botão de download em `ServiceOrderCard.tsx`: idem.
   - Rota `_app.ordens.$id.imprimir.tsx`: manter como está (já busca via `useSuspenseQuery`); passar também `orderId` para redundância/consistência, mas continuar enviando `materials` pré-carregados (evita fetch duplicado).

3. **Reforçar robustez do merge (`downloadServiceOrderReportPdf`)**
   - Validar `Content-Type` da resposta e/ou os primeiros bytes `%PDF-` antes de `PDFDocument.load` — assim URL expirada ou HTML de erro não derruba o merge silenciosamente.
   - Manter o `ignoreEncryption: true` já presente.
   - Se algum anexo falhar, avisar via `toast.warning` (não bloquear o download).
   - Log claro no `console.warn` incluindo a URL truncada para facilitar diagnóstico futuro.

4. **Validação**
   - Rebuild e teste manual na OS #1072 (já com 1 PDF anexado de 4 páginas): PDF final deve ter 1 página do relatório + 4 páginas do material.
   - Testar também o botão "Baixar PDF" a partir da lista de Ordens e do card, garantindo que agora as páginas anexadas também aparecem.
   - Testar como técnico (não-admin): download continua funcionando sem materiais e sem erro visível.

## Fora de escopo

- Não alterar o schema do banco, RLS, tabela de anexos, nem o UI de upload (funcionando corretamente conforme prints).
- Não mexer no fluxo de finalização/apuração de horas.

## Resumo técnico

- Ponto único de responsabilidade pelo merge continua em `downloadServiceOrderReportPdf`.
- Assinaturas mudam de forma retrocompatível: `materials?: string[]` continua; adiciona-se `orderId?: string`.
- Zero mudança de rota; zero mudança de dados persistidos.
