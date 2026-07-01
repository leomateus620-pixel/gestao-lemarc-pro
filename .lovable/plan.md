## Objetivo
Na visão expandida de cada OS finalizada (menu Ordens), manter apenas o botão **BAIXAR PDF** — remover **IMPRIMIR PDF** e **GERAR RELATÓRIO** — e destacar visualmente o botão mantido.

## Escopo
Arquivo único: `src/components/ordens/ServiceOrderIslandRow.tsx`.

Sem mudanças em rotas, dados, PDFs, wizard, dialogs, ou fluxo de finalização. O botão "PDF OS" compacto no cabeçalho da OS (topo do card) fica intacto. A rota `/ordens/$id/imprimir` continua existindo e acessível via "Abrir OS" (que já possui o botão "Baixar PDF" e "Imprimir/Salvar PDF" internos) — só removemos os atalhos duplicados da linha de ações da ilha.

## Mudanças

### 1. Remover os dois botões duplicados (linhas ~219-224)
Excluir os `<ActionLink to="/ordens/$id/imprimir" …>` de "Imprimir PDF" e "Gerar relatório". Se `Printer` e `FileText` ficarem sem uso após a remoção, retirar dos imports do `lucide-react` para evitar warning de import não usado.

### 2. Destacar visualmente o `OrderPdfActionButton`
Reescrever o estilo para que seja o CTA principal dessa faixa de ações — proeminente, verde vibrante, com sombra e destaque:

- Fundo sólido em gradiente `bg-status-done` (verde) em vez do atual `bg-status-done/12` translúcido
- Texto branco/preto forte (`text-white`) — usar token semântico do próprio `--status-done-foreground` se existir; senão manter branco via classe já usada no design system (verificar tokens existentes em `styles.css` antes de aplicar)
- Ícone maior (`size={16}`) e label mais legível: manter texto **"Baixar PDF"** com `text-xs` (ao invés de `text-[10px]`), tracking mais suave e padding maior (`px-4 min-h-11`)
- Shadow/glow: `shadow-[0_8px_24px_-12px_theme(colors.emerald.500)]` ou equivalente já disponível no design system
- Hover mais notável (`hover:brightness-110` ou aumento de opacidade)
- Manter `stopPropagation`, estado `loading` e `Loader2`

### 3. Layout da faixa
A faixa `<div className="mt-4 flex gap-2 overflow-x-auto …">` continua com "Abrir OS" (primário laranja), opcionalmente `actionLabel` (Aprovar / Encerrar), e o `OrderPdfActionButton` destacado. Sem outros botões.

## Validação
- Abrir OS #1017 (aprovada) → confirmar visualmente: apenas 3 ações (Abrir OS · [ação de status opcional] · Baixar PDF verde destacado)
- Clicar "Baixar PDF" → confirma download do PDF (sem navegar/expandir)
- Verificar OS em status `running`/`open` → botão PDF não aparece (comportamento atual preservado via `isClosedOrder`)
- `bunx tsgo --noEmit src/components/ordens/ServiceOrderIslandRow.tsx`

## Fora do escopo
- Página `/ordens/$id/imprimir` (mantida intacta — acessível por "Abrir OS" → header)
- Botão compacto "PDF OS" no cabeçalho da linha (não alterado)
- Qualquer lógica de geração de PDF
