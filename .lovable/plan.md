## Objetivo

Adicionar um botão "PDF OS" nos cards de OS **finalizadas** (`finished`) e **aprovadas** (`approved`) da lista `/ordens`, ocupando o espaço onde hoje aparece o badge de prioridade "Média". O clique busca dados financeiros sob demanda e gera um PDF individual da OS, no mesmo padrão visual do relatório gerencial (jspdf + identidade Lemarc).

## Escopo

### 1. Novo helper `src/lib/reports/serviceOrderDownload.ts`
Baseado em `managerialDownload.ts`, exporta:
- `buildServiceOrderReportFilename(order, generatedAt)` → `os-<numero>-<slug-cliente>-YYYY-MM-DD.pdf`
- `downloadServiceOrderReportPdf({ order, entries, financials, generatedAt, authorName })`

Layout A4 retrato com:
- Cabeçalho: logo Lemarc + dados da empresa (`LEMARC_COMPANY`) + bloco "RELATÓRIO DE OS #<numero>" com data/emitente
- Identificação: cliente + CNPJ, unidade + CNPJ + cidade/UF, local, solicitante, status, prioridade, tipo, abertura, fechamento
- Técnicos envolvidos (via `getOrderTechnicians`)
- Descrição da OS
- Tabela de apontamentos: técnico, função, data, entrada/saída, horas (`formatHHmm`), R$/h, subtotal, descrição
- Bloco de deslocamento quando aplicável
- Resumo financeiro (mão de obra, deslocamento, materiais, total geral) usando `formatBRL`
- Se `financials` for `null`: card de aviso "Apuração financeira pendente"
- Observações se houver
- Bloco de assinatura do responsável ou aviso de dispensa (mesmos dados hoje mostrados no `ServiceOrderReportDocument`)
- Rodapé com paginação e nome do gerador

Reutiliza `LEMARC_COLORS`, `LEMARC_COMPANY`, `LEMARC_LOGO_URL`, `LEMARC_LOGO_ASPECT`, `formatBRL`, `formatHHmm`, `getOrderTechnicians`, `sanitizePdfText`, `displacementTypeLabel`, e o mesmo cache do logo/paginação/rodapé usados em `managerialDownload.ts` (extrair helper compartilhado se for pequeno; caso contrário duplicar de forma isolada dentro do arquivo para não mexer no gerencial).

### 2. `src/components/app/ServiceOrderCard.tsx`
- Trocar o wrapper `<Link>` externo por um `<div>` com `role="link"`, `tabIndex={0}`, handlers `onClick`/`onKeyDown` (Enter/Space) que chamam `navigate({ to: "/ordens/$id", params: { id } })`. Mantém foco visível e `aria-label`.
- No slot onde hoje ficam `ServiceOrderStatusBadge` + `ServiceOrderPriorityBadge`:
  - OS `finished` ou `approved`: renderizar `<OrderPdfButton order={order} />` no lugar do badge de prioridade (status continua acima).
  - OS `cancelled` ou outras: renderizar prioridade como hoje.
- Novo componente local `OrderPdfButton`:
  - Botão compacto com ícone `FileDown` + texto "PDF OS" (mobile: só ícone opcional; usar mesma altura/estilo do badge para não quebrar layout).
  - `onClick` faz `event.stopPropagation()` + `event.preventDefault()`, seta estado `loading`, chama `useServerFn(getOrderFinancials)({ data: { orderId: order.id } })`, gera o PDF via `downloadServiceOrderReportPdf`, mostra `toast.success("PDF da OS #<n> baixado")` ou `toast.error(...)`.
  - `aria-label="Baixar PDF da OS #<n>"`, estado `Gerando…`, `active:scale-[0.98]`, `disabled` durante o loading.
- Nome do autor: usar `useAuth().displayName` (já usado na rota de impressão).

### 3. `src/routes/_app.ordens.$id.imprimir.tsx`
- Adicionar botão "Baixar PDF" ao lado de "Imprimir / Salvar PDF" no header no-print, usando o novo helper com os dados já carregados pelos `useSuspenseQuery` existentes. Mantém a impressão do documento HTML atual.

### 4. Fora do escopo
- Não criar migrations, tabelas, rotas novas nem mocks.
- Não alterar `ServiceOrderReportDocument.tsx` nem `financials.functions.ts`.
- `routeTree.gen.ts` não deve mudar (nenhuma rota criada).
- Cards de OS não finalizadas continuam exibindo prioridade como hoje.

## Detalhes técnicos

- **Nested link**: refatorar `ServiceOrderCard` de `<Link>` para `<div role="link">` é mais seguro que `<button>` dentro de `<Link>` (evita hidratação inválida). Usar `useNavigate` de `@tanstack/react-router`.
- **Server fn**: `getOrderFinancials` já usa `requireSupabaseAuth`; chamada apenas no clique não impacta SSR do listing.
- **Slug do arquivo**: normalizar cliente (NFD, remover acentos, `[^a-z0-9]+` → `-`), truncar 36 chars, fallback `sem-cliente`.
- **jspdf**: import dinâmico (`await import("jspdf")`) como no `managerialDownload.ts` para manter o chunk assíncrono.
- **Cache logo**: reaproveitar mesma função `loadLemarcLogoDataUrl` — extraí-la para um helper compartilhado `src/lib/reports/pdfShared.ts` (movendo do `managerialDownload.ts`) para não duplicar. Alteração mínima e não muda o comportamento do gerencial.

## Validação

- `bunx tsgo --noEmit` nos arquivos alterados.
- Playwright headless em `/ordens`: verificar que o botão aparece apenas em OS `finished`/`approved`, clicar não navega, um `download` é disparado (mock via `page.on("download")`).
- Screenshot desktop (1280) + mobile (390) para conferir que o slot não trunca.
- Testar OS com múltiplos técnicos/apontamentos e OS finalizada sem `financials` (aviso "Apuração financeira pendente").
- Verificar visualmente 1 PDF renderizado (via `pdftoppm`) para checar paginação, rodapé e ausência de sobreposição.

## Arquivos

- **Criado**: `src/lib/reports/serviceOrderDownload.ts`, `src/lib/reports/pdfShared.ts`
- **Editado**: `src/components/app/ServiceOrderCard.tsx`, `src/routes/_app.ordens.$id.imprimir.tsx`, `src/lib/reports/managerialDownload.ts` (só para importar `loadLemarcLogoDataUrl` do módulo compartilhado)
