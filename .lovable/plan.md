## Objetivo
No header do AppShell (chip superior do sistema), trocar o `<Logo size="sm" />` (ícone Cog + texto "GESTÃO LEMARC") pela logo original usada na tela de login (`/branding/lemarc-login-logo.png`), mantendo o mesmo tamanho visual e o alinhamento atual do header — sem afetar o restante (título, subtítulo, avatar, botão Nova OS, botão Sair).

## Escopo
Apenas presentation. Um único arquivo:

- `src/components/app/AppShell.tsx`
  - Substituir o `<Logo size="sm" />` dentro do `<Link to="/dashboard">` por um `<img>` apontando para `/branding/lemarc-login-logo.png`.
  - Manter o link clicável para `/dashboard`.
  - Dimensionar para casar com o footprint atual do chip do logo (altura ~36–40px, mesma do botão "Voltar" / avatar — `h-9` a `h-10`), `w-auto`, `object-contain`.
  - Preservar `shrink-0` para não quebrar o flex do header.
  - Adicionar `alt="Gestão Lemarc"`, `decoding="async"`, `draggable={false}`.

Nenhuma alteração em `Logo.tsx` (continua sendo usado em outros lugares, se houver) e nenhuma mudança em estilos globais, tokens, padding, gap ou altura do header.

## Validação (Playwright autenticado)
- `/dashboard` em desktop (1280) e mobile (390): conferir que a logo original aparece no chip do header, com a mesma altura do avatar/botão Voltar, sem quebrar o alinhamento horizontal (título e ícones permanecem na mesma posição).
- Conferir contraste da logo sobre o fundo `lemarc-liquid` (navy translúcido) — a logo de login já foi desenhada para fundo escuro, então deve permanecer legível.
- Conferir que clicar na logo continua navegando para `/dashboard`.
- Em rotas com `back` (ex.: `/ordens/nova`) o header mostra o botão Voltar em vez da logo — comportamento atual preservado.

## Fora de escopo
- Tela de login (continua igual).
- Componente `Logo` (não removido; só deixa de ser usado no AppShell).
- Qualquer ajuste de cores, fundo, cards ou tipografia.

## Riscos
- Se a imagem original for muito larga, pode empurrar o título. Mitigação: `h-9`/`h-10` + `w-auto` + `max-w-[160px]` para travar a largura no chip; `object-contain` garante que a proporção não distorça.
