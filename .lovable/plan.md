# Fundo claro com sombra quente (laranja + azul)

## Objetivo
Reaquecer o fundo geral do app — hoje totalmente azul claro — adicionando uma camada de cor sombreada laranja, para reforçar a identidade Lemarc (navy + laranja) e aumentar o contraste com os cards escuros sem voltar ao branco/azul puro.

## Conceito visual
Base permanece clara, mas migra de "azul gelo neutro" para um tom de **areia clara levemente azulada**, com **halos quentes** mais presentes nos cantos. Resultado: o centro respira em creme/azulado suave, as bordas ganham um banho laranja amanhecer, e os cards navy ficam ainda mais destacados (contraste quente×frio em vez de frio×frio).

Paleta proposta para `lemarc-app-bg`:
- Base: `oklch(0.95 0.018 75)` (areia clara morna, leve viés âmbar).
- Halo superior-esquerdo: laranja translúcido mais visível — `oklch(0.78 0.16 55 / 0.18)` em raio amplo.
- Halo inferior-direito: âmbar quente baixo — `oklch(0.82 0.12 65 / 0.22)`.
- Halo central: azul gelo suave para manter conexão com a identidade — `oklch(0.93 0.04 235 / 0.55)`.
- Gradiente diagonal: cream → azul muito pálido → cream quente, em 160°.
- Mantém `background-attachment: fixed`.

Tokens de texto sobre o fundo continuam navy (`--on-app-bg`) — contraste segue alto sobre o tom claro morno.

## Arquivos alterados
- `src/styles.css`
  - Reescrever `@utility lemarc-app-bg` com a nova composição (base areia + halos laranja/âmbar + halo azul central).
  - Atualizar `html, body { background-color }` para a nova base `oklch(0.95 0.018 75)` para casar com áreas fora do shell (rubber-band scroll, popovers).
- Nenhum outro arquivo precisa mudar. `lemarc-liquid`, cards, `section-title`, wrappers `bg-white/55`, EmptyOperations etc. já se integram a uma base clara — apenas ganham um sub-tom mais quente.

## Validação (Playwright autenticado)
Capturar `/dashboard`, `/ordens`, `/clientes`, `/colaboradores` em desktop (1280) e `/dashboard` em mobile (390). Conferir:
- Halos laranja perceptíveis nos cantos sem virar "amarelado" ou competir com cards.
- Cards navy/glass continuam com contraste forte (na verdade melhor, por causa do contraste quente×frio).
- Textos escuros (`--on-app-bg`) seguem legíveis sobre o creme.
- Chip do header e bottom nav (navy translúcido) seguem nítidos.
- Wrapper "Cards operacionais" (`bg-white/55`) e EmptyOperations integram-se à nova base sem ficarem "encardidos".

## Fora de escopo
- Nenhuma rota, hook, query, ação ou dado. Só a definição visual do `lemarc-app-bg` e o `body` de fallback.
- Cards e componentes internos não mudam.

## Riscos
- Halos muito fortes podem dar aparência "envelhecida"/sepia: opacidades mantidas baixas (0.18–0.22) e raios grandes.
- Base muito amarelada poderia conflitar com o laranja primário: por isso a base usa croma baixíssimo (0.018) — quase neutra, só insinuando calor.
