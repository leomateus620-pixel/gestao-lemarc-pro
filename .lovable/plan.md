# Assinatura do responsável na OS

Adiciona coleta de assinatura do responsável da empresa antes da finalização da OS, com armazenamento rastreável, bloqueio para técnico, exceção para gestor e exibição no PDF.

## 1. Banco de dados (migration)

Tabela `public.service_order_signatures`:
- `id uuid pk default gen_random_uuid()`
- `service_order_id uuid not null references service_orders(id) on delete cascade`
- `signed_by_name text not null`
- `signed_by_role text` (cargo/documento opcional)
- `signature_path text` (path no bucket, preferencial)
- `signature_data_url text` (fallback inicial; um dos dois preenchido)
- `signed_at timestamptz not null default now()` (servidor)
- `collected_by uuid references auth.users(id)` (técnico autenticado)
- `user_agent text`, `device_info jsonb`, `geo_lat numeric`, `geo_lng numeric`
- `signature_hash text` (sha256 de `order_id|name|signed_at|payload`)
- `revoked_at timestamptz`, `revoked_by uuid`, `revoke_reason text`
- `metadata jsonb`, `created_at timestamptz default now()`
- Index único parcial: uma assinatura ativa (`revoked_at is null`) por OS.

GRANT SELECT/INSERT a `authenticated`, ALL a `service_role`. RLS:
- SELECT: qualquer autenticado (mesma política das OS).
- INSERT: autenticado, `collected_by = auth.uid()`.
- UPDATE (revoke): apenas `has_role(auth.uid(),'admin')`.
- DELETE: bloqueado.

Em `service_orders` adicionar:
- `signature_waiver_reason text` (justificativa de exceção)
- `signature_waived_by uuid references auth.users(id)`
- `signature_waived_at timestamptz`

Bucket privado `service-order-signatures` via tool de storage; políticas em `storage.objects` permitindo INSERT/SELECT a `authenticated` apenas em paths `{order_id}/...`.

## 2. Server functions (`src/lib/api/serviceOrders.functions.ts`)

- `getServiceOrderSignature({ orderId })` — retorna assinatura ativa + signed URL do bucket.
- `saveServiceOrderSignature({ orderId, signedByName, signedByRole?, signatureBase64, geo?, deviceInfo? })` — usa `requireSupabaseAuth`; faz upload PNG no bucket (path `{orderId}/{uuid}.png`), calcula hash, insere linha, captura `user_agent`/IP via `getRequestHeader`. Se já existir ativa, exige `replace: true` e revoga a anterior.
- `waiveServiceOrderSignature({ orderId, reason })` — só admin; grava waiver na OS.
- Ajustar `updateServiceOrderStatus`: ao transicionar `running → finished` (ou `finished → review`, definir no fluxo final — usar `finished`), validar que existe assinatura ativa OU waiver; senão retornar erro amigável.
- Estender `getServiceOrder` select para incluir assinatura ativa e campos de waiver.

## 3. Tipos e UI

Atualizar `src/types/serviceOrder.ts` (`ServiceOrder` ganha `signature?`, `signature_waiver_*`). `integrations/supabase/types.ts` regenerado pela migration.

Componentes novos em `src/components/ordens/signature/`:
- `SignaturePad.tsx` — canvas responsivo (lib `signature_pad`), suporte touch/pen, linha guia, alta DPR, exporta PNG transparente trimado.
- `SignatureCaptureScreen.tsx` — tela cheia (Dialog fullscreen) com hint de landscape via `screen.orientation.lock('landscape')` quando suportado, área grande de assinatura, campos Nome (obrigatório) e Cargo (opcional), declaração de validação, botões Voltar / Limpar / Confirmar. Geolocalização opcional (`navigator.geolocation`).
- `SignatureBlock.tsx` — bloco compacto na OS com 3 estados (Pendente / Registrada / Finalizada sem assinatura), preview, badge, ações.
- `WaiveSignatureDialog.tsx` — somente admin (`useUserRole`), exige justificativa.

Integrar em `src/routes/_app.ordens.$id.tsx` acima do `FinancialBlock`. Em `FinalizeServiceOrderDialog.tsx`, bloquear submit se sem assinatura/waiver, mostrando CTA para coletar.

## 4. PDF (`ServiceOrderReportDocument.tsx`)

Nova seção "Assinatura do responsável" com nome, cargo, data/hora, imagem (signed URL pré-renderizada), `collected_by`, hash curto. Se waiver: mostrar "Finalizada sem assinatura" + justificativa + responsável pelo waiver. Se nada: "Assinatura não registrada."

## 5. Segurança/rastreabilidade

- `signed_at` e hash gerados no servidor.
- `collected_by = auth.uid()` via middleware.
- User-agent/IP via `getRequestHeader`/`getRequestIP`.
- Geo opcional, com consentimento.
- Substituição registra revogação (linha antiga `revoked_at`/`revoked_by`/`revoke_reason`).
- Declaração textual exibida antes do Confirmar.
- Mensagem clara: "rastreabilidade operacional, não validade jurídica plena."

## 6. Não-quebra

Mantém rotas `/ordens`, `/ordens/nova`, `/ordens/$id`, `/ordens/$id/imprimir`, finalização, revisão e apuração. OS antigas sem assinatura continuam visíveis; bloqueio só aplica a transições futuras.

## 7. Validação

`bunx tsgo --noEmit`, build, ESLint focado nos arquivos tocados, e Playwright (mobile 390 vertical/horizontal + desktop 1280) para o fluxo: coletar → confirmar → finalizar → bloqueio sem assinatura → waiver admin → PDF.

## Detalhes técnicos resumidos

- Lib: `signature_pad` (pequena, sem deps; ~10kb) instalada com `bun add signature_pad`.
- Upload: PNG base64 → `Uint8Array` → `supabase.storage.from('service-order-signatures').upload(path, bytes, { contentType: 'image/png' })` com admin client dentro do handler (`await import('@/integrations/supabase/client.server')`) para evitar problemas de RLS de storage na primeira iteração; policies de storage ainda escritas restringindo SELECT/INSERT por `authenticated`.
- Signed URL: `createSignedUrl(path, 3600)` no `getServiceOrder` e no momento da geração do PDF.
- Hash: `crypto.createHash('sha256').update(...).digest('hex').slice(0,16)` como `SIG-xxxxxxxxxxxxxxxx`.
