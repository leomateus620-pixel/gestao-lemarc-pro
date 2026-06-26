# Adicionar a logo oficial Lemarc nos relatórios

## Objetivo
Trocar a marca tipográfica de fallback ("L" + GESTÃO LEMARC) pela **logo oficial Lemarc Industrial** (LEMARC azul + engrenagem laranja) tanto no PDF gerado quanto na pré-visualização HTML.

## Passos

1. **Converter o PDF vetorial para PNG de alta resolução**
   - Renderizar `Curvas_LEMARC_Horizontal.pdf` (página 1) a 600 dpi com `pdftoppm`.
   - Recortar margens em branco (com PIL) e salvar como PNG transparente otimizado em `/tmp/lemarc-logo.png`.

2. **Subir como asset CDN (Lovable Assets)**
   - `lovable-assets create --file /tmp/lemarc-logo.png --filename lemarc-logo.png > src/assets/lemarc-logo.png.asset.json`
   - Importar o ponteiro `lemarc-logo.png.asset.json` em `src/lib/reports/lemarcBrand.ts` e expor `LEMARC_LOGO_URL`.

3. **Embutir a logo no PDF (`src/lib/reports/managerialDownload.ts`)**
   - Adicionar helper assíncrono `loadLogoDataUrl()` que faz `fetch(LEMARC_LOGO_URL)` → blob → dataURL (cacheado em variável de módulo).
   - Pré-carregar a dataURL no início de `downloadManagerialReportPdf` antes do primeiro `drawHeader`.
   - Substituir `drawLogoMark` por `drawLogo(x, y, w, h)` que chama `doc.addImage(dataUrl, "PNG", x, y, w, h, undefined, "FAST")` mantendo proporção (~2.4:1). Se a dataURL falhar, cai no fallback tipográfico atual.
   - Cabeçalho página 1: logo ~38×16 mm à esquerda; cabeçalho compacto demais páginas: ~26×11 mm.
   - Ajustar `infoX` (página 1) e o offset do texto (páginas seguintes) para acomodar a nova largura sem sobreposição.

4. **Atualizar a pré-visualização HTML (`src/components/reports/print/ManagerialReportDocument.tsx`)**
   - Importar `lemarcLogo` do asset e renderizar `<img src={lemarcLogo.url} alt="Lemarc Industrial" style={{height: 44}} />` no bloco `.cover`, à esquerda do título.
   - Pequeno ajuste de CSS no `.cover` para alinhar logo + título + meta (flex, gap, items-center).

5. **Validar**
   - `bun run build` + `tsgo` para garantir tipagem dos imports de asset.
   - Playwright: abrir `/relatorios/imprimir`, conferir cabeçalho com logo; baixar PDF e renderizar páginas 1 e 2 com `pdftoppm` para confirmar logo nítida, sem cortes/sobreposição e proporção correta.

## Arquivos
- **Novo**: `src/assets/lemarc-logo.png.asset.json` (ponteiro CDN)
- **Editado**: `src/lib/reports/lemarcBrand.ts` (export do URL)
- **Editado**: `src/lib/reports/managerialDownload.ts` (loader + `drawLogo` + ajustes de header)
- **Editado**: `src/components/reports/print/ManagerialReportDocument.tsx` (img no cover)

Sem alterações em queries, server functions, dados ou rotas — somente camada visual.
