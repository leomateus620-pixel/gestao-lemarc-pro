## Escopo

Reescrever apenas a camada visual de 4 componentes, sem tocar em rotas, hooks, queries, payloads, ações ou dados. Mesmos props, mesmos imports, mesmos links de saída.

Arquivos afetados:
- `src/components/app/ServiceOrderCard.tsx`
- `src/components/clientes/ClientCard.tsx`
- `src/components/dashboard/MetricCard.tsx`
- `src/components/dashboard/OperationTodayCard.tsx` (mini stats)
- `src/components/app/EmptyState.tsx`
- Pequeno ajuste de `pb-*` no `AppShell` se a bottom nav estiver cobrindo o final das listas (verificar e ajustar somente se necessário).

Nada é alterado em: `useServiceOrders`, `useClients`, `useOperationalDashboard`, server functions, route files, search params, `usePhysicsCard`.

## Princípios de design comuns

- Mantém identidade Lemarc: navy profundo, laranja, ciano, glass sutil, física suave do `usePhysicsCard` (reduzida no mobile).
- Reduz "grade de caixinhas". Substitui blocos repetidos por linhas/listas com ícone discreto, divisores finos e chips.
- Hierarquia tipográfica mais clara: título dominante; metadados em peso menor; números tabulares com `tabular-nums`.
- Faixa lateral semântica de status já existe — refinar (mais fina, gradiente vertical) em vez de adicionar mais glows.
- Sem novos blocos com `border + bg` espelhados; usar `divide-y border-white/[0.06]` para listas internas.
- Mobile-first: padding compacto, sem grid 2x3 obrigatório, sem overflow horizontal.

## ServiceOrderCard — nova composição

Layout em 3 zonas (não mais grid de 6 caixas):

```text
┌──┬─────────────────────────────────────────────────┐
│  │ OS #1003 · Manutenção elétrica   [● Aprovada]  │
│██│ Título da OS (display, 1.05rem, line-clamp-2)  │
│██│                                  Prioridade md  │
│  ├─────────────────────────────────────────────────┤
│  │ 🏢 Cliente · Unidade                            │
│  │ 📍 Local / setor    👷 Técnico                  │
│  │ 🕒 Aberta hoje 11:46    ⏱ Prev. hoje 12:00     │
│  ├─────────────────────────────────────────────────┤
│  │ ⏳ há 24min   🔗 Unidade vinculada  [pend.?]    │
└──┴─────────────────────────────────────────────────┘
```

Mudanças concretas:
- Header: número + tipo à esquerda; status badge grande à direita; prioridade vira chip pequeno abaixo do status (peso menor, sem competir com o título).
- Título sobe em destaque (sem mudar dado).
- Substituir o `grid sm:grid-cols-2` de 6 `ServiceOrderMetaRow` por uma **lista vertical com divisores**: 3 linhas (cliente/unidade, local/técnico, abertura/previsão). Em desktop (≥`lg`), cada linha pode dividir em 2 colunas usando `lg:grid-cols-2 lg:gap-x-6` para aproveitar o espaço horizontal sem virar caixinhas.
- Ícones menores (`h-3.5 w-3.5`), sem bolha quadrada `h-8 w-8` ao redor — apenas o ícone na cor do accent.
- Faixa lateral: manter, mas reduzir para `w-[3px]`, com gradiente vertical (`from-accent via-accent/60 to-transparent`) — assinatura mais elegante.
- Estado "pendente" por campo: texto em `text-muted-foreground/70` + ícone âmbar pequeno, sem trocar o fundo do bloco.
- Rodapé: manter chips, mas dedup — remover "Técnico definido" e "Unidade vinculada" quando OK; só mostrar quando pendente (vira aviso). Sempre mostrar "Aberta há Xmin".
- Hover desktop: sombra cresce levemente, faixa lateral pulsa de opacidade; no mobile reduzir.

## ClientCard — perfil operacional

```text
┌──┬──────────────────────────────────────────────┐
│  │ [AV] Nome da empresa            [● Ativo]    │
│██│      CNPJ · Segmento                          │
│  ├──────────────────────────────────────────────┤
│  │  3 Unidades  ·  2 OS abertas  ·  18 concl.   │  (linha de pílulas)
│  ├──────────────────────────────────────────────┤
│  │ 🕒 Última: OS #1002 aberta hoje 09:12        │
│  │ 📍 São Paulo / SP    👤 Eduardo Lima         │
│  │ 📞 (11) 99…        ✉ contato@…               │
│  ├──────────────────────────────────────────────┤
│  │            [+ Nova OS]      Detalhes →       │
└──┴──────────────────────────────────────────────┘
```

Mudanças concretas:
- Avatar maior e mais refinado (manter dimensões atuais, ajustar gradiente interno mais sutil).
- Nome em `text-lg font-black` (mais dominante); CNPJ e segmento em uma única linha com `·` como separador, sem chips quadradas.
- Status "Ativo/Inativo" como selo no topo direito (mantém).
- **Indicadores**: substituir `OperationalStat` em grid 3-col com bordas por uma **única linha de pílulas inline** separadas por `·`, com número em `font-display tabular-nums` e label em uppercase menor. Em mobile vira flex-wrap. Acento laranja apenas quando `osOpen > 0`.
- Substituir os 4 `InfoPanel` em grid por **lista compacta com divisores finos**, ícone pequeno alinhado à esquerda. Última movimentação aparece como primeira linha destacada (texto levemente mais forte).
- Ações no rodapé: integradas em barra com `border-t border-white/[0.06]`, "Nova OS" laranja menor, "Detalhes" como link ghost com seta animada no hover; sem caixa de fundo pesada.

## MetricCard (Home) — refinamento

- Diminuir `min-h-[172px]` para auto + `min-h-[148px]`.
- Número principal mantém destaque (`text-[2.6rem]`), mas remover ícone em "card" quadrado grande à direita; usar **ícone fantasma maior, posicionado no canto inferior-direito com `opacity-10`** como marca d'água — leitura do número fica limpa.
- Title em cima, valor logo abaixo, subtitle em 1-2 linhas; rodapé com `footerLabel` + seta (mantém).
- Faixa lateral fica mais fina; remover o `top-0 h-px gradient` (excesso de adornos).
- `emphasis` (alertas > 0) vira animação `pulse` discreta na faixa lateral em vez de sombra vermelha forte.

## OperationTodayCard mini stats

- Manter card pai. Refinar os 4 `Stat`:
  - Reduzir altura (`p-4` → `p-3.5`), número menor (`text-2xl`), label monoespaçada.
  - Substituir caixa do ícone por ícone solto na cor do tom (sem `border + bg`).
  - Divisor vertical fino entre cards no desktop usando `divide-x divide-white/[0.05]` em um grid alternativo, mantendo gap-3 no mobile.

## EmptyState

- Mais humano e industrial. Ícone em moldura hexagonal/diamante sutil (rotacionada com `rotate-45` em um wrapper externo, ícone com `-rotate-45` para ficar reto) em vez de quadrado.
- Adicionar slot opcional `action?: ReactNode` para CTA (compatível com chamadas atuais que não passam — opcional, sem breaking change).
- Padding mais generoso no desktop, compacto no mobile (`p-6 sm:p-8`).

## Responsividade e bottom nav

- Cards usam `p-4 sm:p-5`, títulos `text-base sm:text-lg`.
- Garantir `min-w-0` + `truncate` em todos os textos longos.
- Verificar `_app.tsx` / `AppShell` para `pb-` suficiente quando `BottomNav` está visível. Se faltar, aumentar `pb-24 sm:pb-8` no container principal do AppShell — única edição estrutural permitida fora dos cards, e só se a bottom nav estiver cobrindo conteúdo.

## Validação

- `rg` para confirmar que nenhum import/uso externo dos componentes mudou de assinatura.
- Build automático do harness valida TS/Vite.
- Inspeção visual via Playwright headless em viewport 390 (mobile) e 1280 (desktop) das rotas `/dashboard`, `/ordens`, `/clientes` — capturar screenshot e confirmar:
  - sem overflow horizontal,
  - badges e títulos legíveis,
  - bottom nav não cobre último card.

## Critérios de aceite

- Visual menos "caixinha", mais autoral, hierarquia clara.
- Dados, rotas, hooks e ações intactos (diff cirúrgico nos 5 arquivos listados).
- Build verde; sem regressão em mobile/desktop.
