# Ocultar o menu "Produção" (temporário)

O módulo Leitos Aramados passa a exibir apenas o fluxo de Pedidos. Nada é apagado do banco: a remoção é só de navegação e atalhos, para poder reativar depois sem retrabalho.

## O que muda

- Remoção do item "Produção" da navegação lateral e da barra inferior (mobile) do módulo Leitos Aramados.
- Remoção dos atalhos para Produção no painel inicial ("Ver produção", "Nova ordem de produção" e links nas linhas da tabela) — a tabela permanece, mas sem link clicável para a tela de produção.
- Na tela de Pedidos, os links para ordens de produção geradas deixam de ser clicáveis (a informação continua visível como texto).

## O que não muda

- Tabelas, RPCs, políticas de acesso e dados de produção continuam intactos.
- Regras de bloqueio de técnicos no módulo permanecem como estão.

## Detalhes técnicos

- `src/components/leitos/LeitosShell.tsx`: retirar a entrada `/leitos/producao` de `navItems` e o `MobileNavItem` correspondente; manter os títulos no mapa de rotas para não quebrar o cabeçalho caso a URL seja acessada direta.
- `src/components/leitos/pages/DashboardPage.tsx`: remover os dois botões de link e converter o link da linha em texto simples.
- `src/components/leitos/pages/OrdersPage.tsx`: converter o link da ordem de produção em texto simples.
- Arquivos de rota `src/routes/leitos.producao*.tsx` permanecem no projeto (acesso só por URL direta), para reativação imediata.
