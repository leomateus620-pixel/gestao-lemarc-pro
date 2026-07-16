## Objetivo

Criar um fluxo paralelo ao de fotos: o admin pode anexar PDFs de **materiais** à OS. Técnicos não veem nem o botão nem os PDFs. Ao baixar o PDF da OS, os PDFs anexados são mesclados a partir da 2ª página (após a página do relatório).

O fluxo atual da OS (finalizar, pausar, retomar, fotos, assinaturas, financeiro) não é tocado.

## Escopo

### 1. Backend (Lovable Cloud)

**Migração** — nova tabela + bucket privado dedicado (independente do bucket de fotos):

- `public.service_order_material_attachments`
  - `id uuid pk`, `service_order_id uuid fk → service_orders`, `file_path text`, `file_name text`, `file_size int`, `caption text nullable`, `created_by uuid`, `created_at timestamptz default now()`
  - `GRANT` para `authenticated` e `service_role` (sem `anon`)
  - RLS habilitada, políticas usando `public.has_role(auth.uid(), 'admin')` — só admin SELECT/INSERT/DELETE
- Bucket privado `service-order-materials` + policies de storage limitando a admins
- Limite razoável (ex.: 6 PDFs por OS, 10 MB cada)

**Server functions** em `src/lib/api/serviceOrderMaterialAttachments.functions.ts`:

- `listServiceOrderMaterialAttachments({ orderId })` — retorna itens com `signed_url`
- `createServiceOrderMaterialAttachment({ orderId, dataUrl, fileName, caption? })` — valida `application/pdf`, faz upload
- `deleteServiceOrderMaterialAttachment({ attachmentId })`
- Todas com `.middleware([requireSupabaseAuth])` e validação de admin dentro do handler via `has_role`

### 2. UI (admin-only)

Novo componente `src/components/ordens/attachments/ServiceOrderMaterialsSection.tsx`, renderizado em `src/routes/_app.ordens.$id.tsx` **apenas quando `isAdmin`**. Layout no mesmo padrão visual da seção "Fotos da OS":

- Card "Materiais (PDF)" com badge de contagem
- Botão "Adicionar PDF" abre diálogo com input `type="file" accept="application/pdf"`, campo legenda opcional
- Lista de PDFs anexados com nome, tamanho, data, botão remover
- Ícone/preview: abre `signed_url` em nova aba

Nenhuma referência ao componente na área visível aos técnicos.

### 3. PDF do admin — mesclar materiais a partir da página 2

- Adicionar dependência `pdf-lib` (compatível com o Worker)
- Em `src/lib/reports/serviceOrderDownload.ts`:
  - Após o `doc.output("arraybuffer")` do jsPDF, buscar (via nova server fn ou passado por argumento) os PDFs de materiais da OS
  - Baixar cada PDF via `fetch(signed_url)` no cliente
  - Com `pdf-lib`: carregar o buffer do relatório + append pages de cada PDF anexado em ordem
  - Salvar como blob final e disparar download
- Chamada em `src/routes/_app.ordens.$id.imprimir.tsx` passa a incluir os materiais na chamada
- Sem materiais → comportamento atual inalterado (relatório de 1 página só)

Impressão via `window.print()` continua imprimindo apenas o relatório visual (não mescla PDFs no preview — isso é limitação natural do print do browser). O usuário usa "Baixar PDF" para obter o documento completo.

### 4. Verificação

- `bunx tsgo --noEmit`
- `bunx vitest run src/lib/reports src/components/reports`
- Playwright: OS com 1 PDF anexado → baixar → verificar via `pdf-lib` (script Python/JS) que o resultado tem `1 + N` páginas e a página 2 é o PDF anexado
- Confirmar que sessão de técnico não vê a seção

## Detalhes técnicos

- Convenção de path no storage: `service-orders/{orderId}/{attachmentId}.pdf`
- Signed URLs com TTL de 1h (mesmo padrão do bucket de fotos)
- Autorização dupla: RLS na tabela + verificação `has_role` explícita nas server fns para evitar 500 confuso quando não-admin tenta chamar
- `pdf-lib` é edge-safe (Web APIs, sem Node native)
- Não muda: schema de `service_order_attachments`, fluxo de pausa/retomada, cálculo de horas, componente `ServiceOrderReportDocument` (visual on-screen segue com 1 página)

## Fora de escopo

- Impressão do browser não mescla os PDFs (só o download unificado faz isso)
- Preview inline dos PDFs anexados dentro da tela do admin (apenas link "abrir")
- Edição/reordenação dos PDFs (só adicionar/remover)
