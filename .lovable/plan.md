# Total geral (OS + Materiais) no PDF final

## Objetivo
Ao final do PDF baixado da OS, adicionar um **card de totalização** que soma:
- **Total da OS** (valor atual calculado — mão de obra + deslocamento)
- **Total Líquido dos Materiais** (extraído automaticamente do primeiro PDF anexado no campo "Materiais")
- **Total final** = OS + Materiais

Sem alterar o fluxo atual da OS, apenas somando essa nova apresentação.

## Regras acordadas
- **Múltiplos PDFs anexados:** usar apenas o **Total Líquido do primeiro** PDF (ordem de criação — igual ao já usado hoje).
- **Falha na extração** (PDF escaneado, formato diferente, sem o rótulo): renderizar o card mesmo assim, com aviso `"Não foi possível extrair o Total Líquido do PDF de materiais"` e mostrar apenas o total da OS como total geral.

## Como o valor é extraído
Parse do texto do PDF anexado, procurando o rótulo **"Total Líquido"** (case-insensitive, com/sem acento) seguido do primeiro número no formato pt-BR (`12.445,02`, `1.234.567,89`, `85,00`). Reaproveita `parseBRLToCents` de `src/lib/serviceOrders/finance.ts` para converter em centavos com precisão inteira.

Biblioteca: `pdfjs-dist` (leve, roda no browser, sem worker nativo — usar build `legacy/build/pdf.mjs` com `disableWorker`/fake worker). Já compatível com o bundle atual (`pdf-lib` fica só para merge/desenho).

## Onde entra no fluxo

### 1. Extração (novo módulo)
`src/lib/reports/materialsTotalExtractor.ts`
- `extractTotalLiquidoFromPdf(bytes: Uint8Array): Promise<{ cents: number | null; reason?: "not_found" | "parse_error" }>`.
- Faz o parse página a página, concatena texto, aplica regex tolerante a múltiplos espaços / quebras de linha entre "Total Líquido" e o número.

### 2. Renderização do card
`src/components/reports/print/ServiceOrderReportDocument.tsx`
- Nova `<section>` após "TOTAIS DA OS" (última coisa antes de assinaturas), com layout consistente ao design atual:
  - Linha 1: `Total da OS` … `R$ ...`
  - Linha 2: `Total dos materiais (anexo)` … `R$ ...` **ou** o aviso quando indisponível.
  - Linha 3 (destaque): `Total geral` … `R$ ...` (mesmo estilo do "Total geral" atual).
- Recebe via props opcional `materialsNetCents: number | null` e `materialsExtractionWarning?: string | null`.

### 3. Renderização no PDF baixado (pdf-lib)
`src/lib/reports/serviceOrderDownload.ts`
- Antes de anexar as páginas dos materiais, calcular:
  - Baixar o **primeiro** PDF da lista `materials` (signed URL).
  - Validar magic bytes `%PDF-` (já existe).
  - Chamar `extractTotalLiquidoFromPdf` sobre os bytes.
- Desenhar o card de totalização no **final da página 1** (mesma página do relatório da OS) — ou, se não couber, uma página nova antes dos anexos. Consistente com o layout HTML.
- Depois, seguir com o append normal das páginas dos anexos (fluxo atual).

### 4. Preview (rota `_app.ordens.$id.imprimir.tsx`)
- Buscar bytes do primeiro material via `fetch(signed_url)` no client (Suspense query já existente para materials), extrair o Total Líquido e passar ao `ServiceOrderReportDocument`.
- Cache-key por `file_path` do primeiro anexo → evita re-parse.

## Detalhes técnicos

### Regex de extração
```
/total\s*l[ií]quido[^\d\-]{0,40}(-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|-?\d+(?:,\d{1,2})?)/i
```
- Reutiliza `parseBRLToCents` — não reimplementa parsing numérico.
- Se houver múltiplos matches, usa o **último** (rodapé é mais confiável em orçamentos).

### Consistência entre HTML e PDF
Ambos os renderizadores (`ServiceOrderReportDocument` para preview/print e `serviceOrderDownload` para pdf-lib) recebem o mesmo `materialsNetCents` já computado — a extração acontece **uma vez** por download/preview.

### Sem migração / sem mudança de schema
Não persiste o valor no banco. É sempre derivado do anexo atual — se o admin trocar o PDF, o novo valor é refletido no próximo download. Isso garante que "sempre respeita os valores corretos".

### Testes
- Novo `src/lib/reports/materialsTotalExtractor.test.ts` com casos: formato pt-BR padrão, com espaços/tabs, valor sem casas decimais, PDF sem o rótulo (retorna `null`), múltiplas ocorrências (pega a última).
- Update em `ServiceOrderReportDocument.test.tsx` cobrindo os 3 estados do card: com valor, sem anexo, extração falhou.

## Arquivos alterados
- **novo** `src/lib/reports/materialsTotalExtractor.ts`
- **novo** `src/lib/reports/materialsTotalExtractor.test.ts`
- `src/components/reports/print/ServiceOrderReportDocument.tsx` — nova seção
- `src/lib/reports/serviceOrderDownload.ts` — buscar/extrair antes de anexar, desenhar card
- `src/routes/_app.ordens.$id.imprimir.tsx` — buscar bytes + extrair para o preview
- `package.json` / lockfile — adicionar `pdfjs-dist`
- `src/components/reports/print/ServiceOrderReportDocument.test.tsx` — cobertura dos 3 estados

## Fora de escopo
- Alterar o total registrado em `service_order_financials` (`grand_total_cents` continua sendo só o da OS — o total geral é apresentação).
- Relatório gerencial / exports (`.xlsx`, agregados) — permanecem sem materiais, como hoje.
- Extração de PDFs escaneados via OCR.
