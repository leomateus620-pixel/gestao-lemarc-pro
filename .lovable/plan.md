
## Objetivo
Substituir o wizard de 4 etapas do cadastro/edição de produtos em "Leitos Aramados → Produtos" por uma única tela responsiva, remover campos não operacionais, fixar unidade como `un`, e corrigir bug de campos numéricos que restauram `1` automaticamente. Preservar rotas, dados existentes, permissões e integração Supabase.

## Escopo (o que muda)
Apenas arquivos ligados ao cadastro/edição de produtos:
- `src/components/leitos/pages/ProductsPage.tsx` — reescrever `WireTrayProductFormPage` (wizard) como formulário único.
- `src/lib/wireTrays/schemas.ts` — ajustar `wireTrayProductInputSchema` (SKU/unit opcionais, unit default `"piece"` internamente, remover exigências).
- `src/lib/api/wireTrayProducts.functions.ts` — garantir que unit sempre persiste como `"piece"` (rótulo interno de `un`), aceitar payload sem campos removidos.
- Testes: `src/lib/wireTrays/schemas.test.ts` + novo teste de UI focado no comportamento numérico.

Não muda: autenticação, OS, outras telas do módulo (dashboard, pedidos, produção, estoque), listagem de produtos (continua exibindo SKU quando existir, "Sem SKU" quando null — já suportado), detalhes de produto, políticas RLS, migrações estruturais.

## Mapeamento "unidade"
O enum atual de unidades no banco é `piece | meter | kilogram | set` e `wireTrayUnitLabel.piece = "un"`. Portanto "un" já corresponde a `piece`. Solução: fixar internamente `unit: "piece"` em todo produto criado/editado pelo novo formulário; não expor seletor. Produtos legados com outra unidade preservam o valor no banco (edição não sobrescreve unless o form envia — enviaremos `"piece"` apenas em NOVOS; em edição, preservar unit atual sem exibir seletor).

Decisão: em edição, manter `unit` original do produto carregado (não alterar). Em criação, forçar `"piece"`. Isso preserva histórico e satisfaz "unit fixa `un` para novos".

## Campos removidos da UI
Do formulário (não do banco):
- SKU
- Seletor de unidade
- Notas técnicas
- Local padrão
- Estoque-alvo
- Observações de reposição

Colunas do banco permanecem; server function envia `null`/valor atual conforme apropriado:
- Em criação: SKU=null, technicalNotes=null, defaultLocationId=null, targetStock=null, replenishmentNotes=null.
- Em edição: preservar valores existentes desses campos (não sobrescrever com null) — carregar do produto atual e reenviar inalterados no payload.

## Schema (Zod)
`wireTrayProductInputSchema`:
- `sku`, `technicalNotes`, `defaultLocationId`, `targetStock`, `replenishmentNotes` continuam opcionais/nullable (já são).
- `unit` continua obrigatório no schema, mas o form controla o valor internamente.
- Remover `superRefine` do targetStock≥minimum quando targetStock=null (já ok — refine já ignora null).
- Numéricos (`widthMm`, `heightMm`, `lengthMm`, `minimumStock`, `minimumProductionBatch`): manter validação (não-negativos; batch > 0).

## Correção do bug numérico
Causa: `NumberField` provavelmente usa `Number(value) || 1` ou converte string vazia direto para número em cada keystroke. Correção:
- Estado local do campo como `string` (`""` permitido durante edição).
- `onChange`: aceitar string bruta, apenas filtrar caracteres inválidos (regex `^-?\d*[.,]?\d*$`).
- `onBlur`: parse para número; se vazio → `null` (ou `0` para minimumStock que é obrigatório ≥0); se batch vazio ao submeter e replenishment automático ativo → erro de validação.
- Não usar `|| 1` nem `|| 0` durante digitação.
- `inputMode="decimal"`, `type="text"` para evitar comportamento inconsistente entre navegadores (ou `type="number"` sem fallback lógico).
- Validação exibida no blur/submit, não a cada tecla.

Aplicar a todos os campos numéricos do form.

## Layout novo (tela única)

```text
[Header: eyebrow "Cadastro industrial" · título · descrição · badge status (edição)]

┌─ Identificação ────────────────────────────────────┐
│ Nome do produto*        │ Categoria*               │
│ Situação (ativo/inativo)│                          │
│ Descrição curta (full width)                       │
├─ Especificações físicas ───────────────────────────┤
│ Largura │ Altura │ Comprimento (mm)               │
│ Material            │ Acabamento                   │
├─ Estoque e produção ───────────────────────────────┤
│ Estoque mínimo      │ Lote mínimo de produção     │
│ [ ] Reposição automática                           │
├─ Anexos (se WireTrayDocuments já suporta edição)   │
│ imagem/desenho técnico                             │
└─ Ações (sticky no mobile) ─────────────────────────┘
  [Cancelar]  [Cadastrar produto / Salvar alterações]
```

Desktop: grid 2 colunas dentro de cada seção; container `max-w-4xl` centralizado.
Mobile: coluna única, `pb-24` para não sobrepor bottom nav, ações sticky ou próximas ao final com safe-area.

Reusar tokens/utilitários `wire-*` existentes (`wire-input`, `wire-select`, `wire-field`, `wire-label`, `WirePanel`, `WirePageHeader`). Sem stepper, sem "Próximo/Voltar/Revisão".

## Mutation e navegação
Mantém `useMutation` + `saveWireTrayProduct`. Após sucesso: invalidar mesmas queries de hoje e navegar para detalhe (`/leitos/produtos/$productId`). Botão de submit desabilitado enquanto `mutation.isPending` para evitar duplo envio. Guard de "unsaved changes" via `beforeunload` quando `dirty`.

## Anexos
`WireTrayDocuments` do produto já existe na página de detalhe; **não vou embutir upload no form** nesta iteração para manter escopo (o usuário mantém upload pela tela de detalhe, como hoje). Deixarei uma seção "Anexos" no form apenas se já houver componente pronto de attach por produto pré-persistência — inspecionarei em build mode; se não houver, mantenho como está e o item é opcional conforme spec ("if already supported").

## Testes
- Atualizar `schemas.test.ts`: adicionar teste de que produto válido sem SKU/targetStock/technicalNotes/defaultLocationId passa.
- Novo teste unitário do input numérico controlado (estado string, blur parse) — teste focado em util/hook se extraído; caso contrário, teste de componente pequeno.
- Rodar `bunx vitest run` nos arquivos afetados e typecheck (`tsgo`).

## Critérios de aceitação
- Tela única, sem stepper.
- Nenhum dos 6 campos removidos aparece.
- Produtos novos gravam `unit=piece` (rótulo "un").
- Campos numéricos podem ser apagados completamente sem restauração de `1`.
- Lista e detalhes continuam funcionando com SKU/campos null (já suportados).
- Sem mocks; sem alterações fora do escopo.
- Typecheck, testes e build passam.
