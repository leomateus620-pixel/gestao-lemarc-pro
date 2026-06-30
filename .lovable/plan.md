## Problema
O CTA "Definir valor/hora" em `/colaboradores/$id` (linhas 133–157 de `src/routes/_app.colaboradores.$id.tsx`) usa um gradiente laranja claro de fundo (`from-primary/22 via-primary/15 to-primary/10`) com texto branco/laranja por cima. Isso quebra a tipografia/contraste do módulo, fica "lavado" e destoa dos cards escuros vizinhos (Dados principais, Precificação, header do colaborador).

## Objetivo
Reestilizar o CTA para o mesmo idioma visual dos outros blocos do perfil: superfície escura (mesma do `lemarc-wizard-card` / island), ícone-token laranja em chip, hierarquia tipográfica consistente (eyebrow técnico + título display + descrição), e botão de ação primário compacto à direita. Manter rota, busca de foco (`?focus=rate`) e condição `rateUndefined`.

## Mudanças
- Arquivo único: `src/routes/_app.colaboradores.$id.tsx` (somente o bloco do CTA, ~24 linhas).
- Trocar superfície de gradiente laranja por card escuro `lemarc-wizard-card`/`lemarc-island-row` com borda âmbar discreta + glow lateral sutil para alertar pendência sem "queimar" o layout.
- Estrutura:
  - Chip-ícone 40×40 laranja (mesmo padrão dos panels).
  - Eyebrow técnico (`lemarc-technical-label`, âmbar) "Pendência de cadastro".
  - Título display branco: "Definir valor/hora".
  - Descrição em `text-slate-300` legível.
  - Botão à direita usando classe `lemarc-primary-action` com ícone `ArrowRight` (mesmo padrão do botão "Novo colaborador").
- Responsivo: em mobile, botão vai para baixo do texto (stack), full-width.
- Acessibilidade: mantém `<Link>` envolvendo o conteúdo, com `aria-label` explícito.

## Fora de escopo
- Demais cards, métricas, header e ações do perfil.
- Lógica de mutação, rotas, queries — sem alterações.
- Estilo do banner inativo (`!collaborator.active`) já é separado.

## Validação
- `bunx tsgo --noEmit`.
- Captura via Playwright em `/colaboradores/{id-sem-rate}` desktop (1280) e mobile (390) para conferir contraste, alinhamento e ausência de "faixa lavada".
- Conferir que ao clicar o CTA, vai para `/colaboradores/$id/editar?focus=rate`.

## Entregável
Antes/depois em screenshots e confirmação de que o CTA aparece somente quando `rateUndefined === true`.
