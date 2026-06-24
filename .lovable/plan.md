## Objetivo

Atualizar a imagem que aparece quando o link do site é compartilhado (WhatsApp, Slack, X, etc.) para usar a logo da Lemarc no lugar do screenshot genérico atual.

## O que muda

Em `src/routes/__root.tsx`, no array `meta` do `head()`:

- Remover as duas entradas duplicadas de `og:image` e `twitter:image` que apontam para os screenshots `pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/...` (linhas 92–101 e 105–106).
- Adicionar uma única entrada de `og:image` e uma de `twitter:image` apontando para a logo já hospedada no domínio canônico:
  `https://lemarcgestao.com/branding/lemarc-login-logo.png`
- Adicionar `og:image:alt` = "Logo Gestão Lemarc" para acessibilidade.
- Manter `twitter:card` como `summary` (logo quadrada/retangular pequena combina melhor com `summary` do que com `summary_large_image`).

Também removo as três linhas duplicadas que sobrescrevem `description` / `og:description` / `twitter:description` com o texto curto "Gestão de ordens de serviço." (linhas 102–104), mantendo apenas a descrição completa já definida acima — elas estavam causando o texto truncado visto na pré-visualização atual.

## Arquivos alterados

- `src/routes/__root.tsx` — apenas o bloco `meta` do `head()`.

## Observação importante

Plataformas como WhatsApp, LinkedIn e X mantêm cache da pré-visualização antiga. Depois do deploy, a nova imagem pode demorar a aparecer; é possível forçar atualização nos debuggers de cada plataforma (Facebook Sharing Debugger, X Card Validator, LinkedIn Post Inspector).

## Fora do escopo

- Não vou gerar uma nova imagem 1200×630 dedicada para social (a logo atual será usada como está).
- Nenhuma outra rota ou componente é alterado.
