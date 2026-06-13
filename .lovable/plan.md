
## Gestão Lemarc — Plano da v1 (UI/estrutura, sem backend)

Construir a base visual e de navegação do app mobile-first, com dados fictícios. Sem autenticação real, sem banco — pronto para receber regras de negócio depois.

### Identidade visual (design tokens em `src/styles.css`)

- Navy profundo como fundo (`--background` ~ oklch(0.18 0.04 250))
- Azul aço para superfícies (`--card`, `--secondary`)
- Laranja vibrante de destaque (`--primary` ~ oklch(0.72 0.19 50)) — CTAs e status ativo
- Branco para texto principal, cinza azulado para secundário
- Glass leve: `background: color-mix(in oklab, var(--card) 75%, transparent)` + `backdrop-filter: blur(14px)` + borda 1px translúcida
- Sombras suaves multicamada (`--shadow-card`, `--shadow-glow-orange`)
- Tipografia: display industrial (Archivo / Saira Condensed) + corpo neutro (Inter)
- Iconografia: lucide-react (Wrench, HardHat, Cog, Zap, Factory, ClipboardList, Camera, Play, Square)
- Padrão sutil de "blueprint" / linhas em headers de seção

### Arquitetura de rotas (TanStack Start, file-based)

```
src/routes/
  __root.tsx                 → shell global (HeadContent, providers)
  index.tsx                  → redireciona para /login (mock)
  login.tsx                  → tela de login
  _app.tsx                   → layout autenticado mock (AppShell + BottomNav mobile)
  _app.dashboard.tsx         → dashboard (gestor OU colaborador conforme role mock)
  _app.ordens.index.tsx      → lista de OS
  _app.ordens.nova.tsx       → criar nova OS
  _app.ordens.$id.tsx        → detalhe da OS (com ações de fluxo)
  _app.clientes.tsx          → lista simples de clientes
  _app.colaboradores.tsx     → lista simples de colaboradores
  _app.relatorios.tsx        → relatórios (cards + gráfico mock)
```

Role mock (gestor/colaborador) controlada via Zustand ou contexto leve — alterna o conteúdo do dashboard e os itens visíveis na navegação. Botão de troca de papel visível para demo.

### Componentes-chave (`src/components/`)

- `AppShell` — header com logo Gestão Lemarc, avatar, ícone de notificações
- `BottomNav` — navegação inferior fixa (Início, Ordens, Clientes, Relatórios, Perfil)
- `GlassCard` — wrapper com efeito glass
- `StatCard` — métrica + ícone + delta (dashboard gestor)
- `OrderCard` — card de OS na lista (cliente, unidade, status, prioridade, tempo)
- `StatusBadge` — variantes: Pendente / Em Deslocamento / Em Execução / Em Revisão / Concluída
- `BigActionButton` — botão laranja grande (Iniciar OS no dashboard colaborador)
- `Timeline` — etapas do fluxo da OS no detalhe
- `PhotoGrid` — placeholders de fotos anexadas
- `EmptyState`, `SectionHeader`

### Fluxo na tela de detalhe da OS

Botão único contextual que avança o estado (mock, sem persistência real):
Pendente → Iniciar Deslocamento → Iniciar Serviço → Adicionar Descrição/Fotos → Finalizar → Enviar para Revisão. Timeline mostra carimbos de hora fictícios. Para gestor: cartão com "Tempo trabalhado" e botão "Gerar relatório de cobrança" (abre modal mock).

### Dados mockados (`src/lib/mock/`)

`clientes.ts`, `colaboradores.ts`, `ordens.ts`, `relatorios.ts` com 6–10 itens cada, nomes realistas do setor (ex.: "Metalúrgica São Bento — Unidade Jundiaí"), serviços nas áreas mecânica/elétrica/automação/montagem/manutenção/instalação.

### Telas — conteúdo

1. **Login** — fundo navy com textura blueprint, card glass central, logo "Gestão Lemarc" (texto estilizado + ícone engrenagem laranja), campos e-mail/senha, botão laranja "Entrar", link "Esqueci minha senha". Submit → navega para `/dashboard`.
2. **Dashboard Gestor** — 4 StatCards (OS abertas, em execução, concluídas hoje, horas trabalhadas), lista das últimas OS, atalho "Nova OS".
3. **Dashboard Colaborador** — saudação, próxima OS destacada, BigActionButton "Iniciar Ordem de Serviço", lista compacta das OS do dia.
4. **Lista de OS** — busca + filtros (status, prioridade), lista de OrderCards.
5. **Detalhe da OS** — header com cliente/unidade/status, dados do serviço, timeline, fotos, botão de ação contextual.
6. **Nova OS** — formulário multi-step simples (cliente → unidade → colaborador → descrição/prioridade → revisar), apenas UI.
7. **Clientes** — lista com avatar/iniciais, nome, unidades, contato.
8. **Colaboradores** — lista com função (Mecânico, Eletricista, Técnico em Automação…), status (Disponível/Em campo).
9. **Relatórios** — cards de totais, gráfico de barras mock (Recharts) horas por colaborador, lista exportável (mock).

### Detalhes técnicos

- Mobile-first: container `max-w-md mx-auto`, safe-areas, BottomNav fixa com `pb-[env(safe-area-inset-bottom)]`
- `preview_ui--set_preview_device_viewport` para mobile no fim do build
- Sem Lovable Cloud nesta etapa — tudo mock
- shadcn já presente: usar Button, Input, Card, Badge, Tabs, Dialog, Sheet (para filtros)
- Recharts para o gráfico de relatórios
- Atualizar `head()` em cada rota com título/descr próprios; manter `__root.tsx` com `<Outlet />`

### Fora de escopo (próximas iterações)

Autenticação real, banco/Cloud, upload real de fotos, geolocalização, geração de PDF, push notifications, RLS/roles server-side.
