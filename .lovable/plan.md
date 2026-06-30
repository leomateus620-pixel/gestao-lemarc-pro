## Problema

No mobile, o dialog de assinatura usa um layout em coluna única vertical (sidebar com campos → pad de assinatura → footer com botões). O conteúdo ultrapassa a altura da viewport (`100dvh`), mas o `DialogContent` não tem scroll interno e o footer fica empurrado para fora da tela — o usuário não consegue rolar até "Confirmar assinatura". Além disso, o botão "Limpar" só aparece no footer (também invisível) e o pad ocupa altura desnecessária quando os campos já são grandes.

## Solução proposta (somente UI/UX, sem mexer em lógica)

Reestruturar `SignatureCaptureDialog.tsx` para um layout mobile-first realmente funcional:

### 1. Estrutura do Dialog
- Manter fullscreen `h-[100dvh]` mas mudar para layout **header fixo / conteúdo scrollável / footer fixo (sticky)**:
  - `<header>` no topo (não scrolla)
  - `<main>` central com `overflow-y-auto` e `flex-1 min-h-0` — contém campos + pad
  - `<footer>` sticky no rodapé com `safe-area-inset-bottom` para iPhone
- Garante que botões "Voltar / Limpar / Confirmar" fiquem **sempre visíveis** em qualquer tela.

### 2. Layout dos campos e do pad
- **Mobile**: empilhado vertical (campos compactos no topo, pad logo abaixo com altura mínima de ~240px mas flexível).
- **Desktop (sm+)**: grid 2 colunas (campos à esquerda, pad à direita ocupando toda a altura) — como já está.
- Reduzir padding do bloco "Declaração" no mobile e mover "Geo capturada" para um chip menor.
- Tornar o header mais compacto no mobile (título menor, descrição em 1 linha, esconder o subtítulo longo se necessário).

### 3. Ação "Limpar" mais acessível
- Adicionar um **botão "Limpar" flutuante no canto superior direito do próprio pad** (ícone `Eraser`, pequeno, com tooltip "Limpar assinatura"), para o técnico apagar sem precisar rolar.
- Manter o botão "Limpar" também no footer como fallback no desktop.
- Botão fica desabilitado quando o pad está vazio.

### 4. Footer mobile otimizado
- Em mobile: botão **"Confirmar assinatura"** em destaque (largura total), com "Voltar" e "Limpar" como ícones secundários ao lado (mais compactos).
- Em desktop: mantém o layout horizontal atual.
- Aplicar `pb-[env(safe-area-inset-bottom)]` para evitar sobreposição com a barra do Safari iOS.

### 5. Pad de assinatura
- Reduzir `min-h` no mobile para `220px` (cabe melhor) e deixar crescer com `flex-1` quando há espaço.
- Manter responsividade DPR e linha guia já existentes em `SignaturePad.tsx` (sem alterações de lógica).

## Arquivos alterados

- `src/components/ordens/signature/SignatureCaptureDialog.tsx` — reestruturação do layout do Dialog (header fixo, main scrollável, footer sticky, botão limpar dentro do pad, ajustes de tipografia mobile).
- `src/components/ordens/signature/SignaturePad.tsx` — pequeno ajuste para aceitar um botão de limpar sobreposto via `children` opcional OU expor melhor o `clear` (já exposto via ref — sem mudança de API, apenas usar do pai).

## Validação

- Playwright em viewport mobile (390x844) navegando até a OS, abrindo o dialog de assinatura, verificando se o botão "Confirmar assinatura" está visível sem scroll do body, capturando screenshot.
- Playwright em desktop (1280) para confirmar que o layout 2 colunas continua intacto.
- `bunx tsgo --noEmit` no arquivo modificado.

## Sem mudanças

- Nenhuma mudança em `signatures.functions.ts`, migrations, RLS, PDF, ou no `SignatureBlock.tsx`.
- Lógica de save, geo, hash e replace permanece idêntica.
