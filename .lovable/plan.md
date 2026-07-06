## Fotos da OS — anexos por Ordem de Serviço

Adicionar uma seção "Fotos da OS" logo abaixo de "Assinatura do responsável" no detalhe da OS, permitindo até 3 fotos por OS armazenadas no Lovable Cloud, visíveis apenas dentro do detalhe da OS e **fora** do PDF/relatório.

### 1. Banco de dados (migration)

Nova tabela `public.service_order_attachments`:
- `id uuid pk default gen_random_uuid()`
- `service_order_id uuid not null references service_orders(id) on delete cascade`
- `technician_id uuid references technicians(id)`
- `file_path text not null` (caminho no bucket, sem URL pública)
- `file_type text` (ex.: `image/jpeg`)
- `file_size int`
- `caption text`
- `category text check (category in ('antes','depois','evidencia','peca_trocada','outro'))`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null default now()`
- Índice em `service_order_id`.
- Trigger `BEFORE INSERT` que valida `count(*) < 3` para a OS (limite servidor-side, independente do cliente).

GRANTs: `SELECT, INSERT, DELETE` para `authenticated`; `ALL` para `service_role`. RLS habilitado.

Políticas RLS (autenticados apenas):
- `SELECT`: usuário autenticado pode ler anexos de qualquer OS (mesma regra dos demais dados operacionais da OS neste projeto).
- `INSERT`: `auth.uid() = created_by`.
- `DELETE`: dono do upload (`created_by = auth.uid()`) **ou** admin via `public.has_role(auth.uid(),'admin')`.

### 2. Storage

Bucket **privado** `service-order-attachments` (criado via tool dedicada).
- Caminho: `service-orders/{service_order_id}/{attachment_id}.{ext}`.
- Acesso somente via URLs assinadas geradas sob demanda no detalhe da OS (TTL curto, ex.: 1h).
- Políticas em `storage.objects`: leitura/escrita/deleção somente para `authenticated` no bucket, e apenas via server functions (as fns usam o client autenticado do usuário, RLS do storage aplica).

### 3. Server functions (`src/lib/api/serviceOrderAttachments.functions.ts`)

Todas com `requireSupabaseAuth`:
- `listServiceOrderAttachments({ orderId })` → linhas + `signedUrl` (curto TTL) por item. Chamada só no detalhe.
- `createServiceOrderAttachment({ orderId, base64, fileType, caption, category })` → valida `<3`, gera `attachment_id`, faz upload no bucket, insere linha. Limite de tamanho no servidor (ex.: 3 MB pós-compressão).
- `deleteServiceOrderAttachment({ attachmentId })` → checa permissão (dono ou admin), remove do storage e da tabela.

### 4. UI (mobile-first, integrada ao visual atual)

Novos componentes em `src/components/ordens/attachments/`:
- `ServiceOrderAttachmentsSection.tsx` — GlassCard com título "Fotos da OS", subtítulo pt-BR, contador `x/3`, grid compacto de thumbs, CTA "Adicionar foto" (desabilitado ao atingir 3, com mensagem "Limite de 3 fotos por OS atingido.").
- `ServiceOrderPhotoUploader.tsx` — Dialog com `<input type="file" accept="image/*" capture="environment">` (abre câmera no mobile), select de categoria (Antes/Depois/Evidência/Peça trocada/Outro), campo legenda opcional, compressão client-side via canvas (redimensiona lado maior a 1600 px, JPEG 0.82), botões Cancelar / Salvar foto, estado de progresso.
- `ServiceOrderPhotoLightbox.tsx` — Dialog fullscreen com imagem, legenda, badge de categoria, data, botão fechar; ação excluir quando permitido.
- Thumb: preview 72–96 px, badge de categoria, tooltip com data.

Integração: renderizado em `src/routes/_app.ordens.$id.tsx` logo após `<SignatureBlock />`. Sem alterações em list cards, dashboard, relatórios ou impressão.

### 5. Performance / lazy loading

- Query `["service-order-attachments", orderId]` só é montada no componente do detalhe (nunca no loader nem em listas).
- URLs assinadas geradas apenas na resposta dessa query; `<img loading="lazy" decoding="async">` nas thumbs.
- Invalidação após upload/delete atualiza apenas essa chave.

### 6. Garantias de não-regressão

- **Nada** é adicionado em `ServiceOrderReportDocument.tsx`, `serviceOrderDownload.ts`, `_app.ordens.$id.imprimir.tsx`, `_app.ordens.index.tsx`, dashboard ou reports.
- Rotas existentes intactas; nenhum arquivo de rota renomeado.
- `service_orders` não é alterada.

### 7. Detalhes técnicos

- Tipos Supabase regenerados após a migration.
- pt-BR em toda copy: título, subtítulo, categorias, empty state ("Nenhuma foto anexada a esta OS."), toasts de sucesso/erro, mensagem de limite.
- Safe-area no dialog do uploader e no lightbox (`env(safe-area-inset-bottom)`), sem overflow horizontal.
- Categorias tipadas em `src/types/serviceOrder.ts` (`ServiceOrderAttachment`, `ServiceOrderAttachmentCategory`).

### 8. Validação após build

Playwright headless em `/ordens/$id` de uma OS existente: renderiza a seção, upload 1→3, bloqueio no 4º, refresh mantém, lightbox abre, delete funciona, `/ordens` e `/ordens/$id/imprimir` inalterados.
