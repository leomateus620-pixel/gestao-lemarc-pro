## Objetivo
1. Zerar as 52 OS existentes no banco, sem afetar cadastros (clientes, colaboradores, unidades, taxas, usuários, configurações) nem fluxos/cálculos, que são todos derivados de OS ativas.
2. Adicionar um botão vermelho pequeno "Excluir OS" ao lado do texto "Ações da OS" no card expandido da tela **Ordens**, restrito a administradores, com confirmação e revalidação da lista.

## Parte 1 — Limpeza do banco

Migração única com um `DELETE FROM public.service_orders` (as 7 tabelas filhas — `service_order_technicians`, `service_order_labor_entries`, `service_order_financials`, `service_order_time_sessions`, `service_order_signatures`, `service_order_attachments`, `service_order_notifications` — já têm FK `ON DELETE CASCADE`, então são limpas automaticamente).

Também limpo `public.service_order_notifications` residuais e `technician_rate_history` **não é** afetado (histórico de valor/hora do colaborador se preserva, como pedido).

Não toco em: `clients`, `client_units`, `technicians`, `user_roles`, `profiles`, `system_settings`, `technician_rate_history`, buckets de storage (arquivos ficarão órfãos mas invisíveis — a UI só lista o que a OS referencia; posso limpar depois se você quiser).

Todos os cálculos (dashboard, relatórios, KPIs, faturamento) são funções puras sobre a lista de OS retornada do banco — com zero OS elas simplesmente exibem estado vazio, sem quebrar.

## Parte 2 — Botão "Excluir OS"

### Backend
Novo `deleteServiceOrder` em `src/lib/api/serviceOrders.functions.ts`:
- `createServerFn({ method: "POST" })` + `requireSupabaseAuth`
- valida `{ id: string }`
- checa `is_admin` via RPC; caso contrário lança "Ação restrita ao administrador"
- executa `supabase.from("service_orders").delete().eq("id", id)` (cascata cuida do resto)

### Frontend
Em `src/components/ordens/ServiceOrderIslandRow.tsx`, no componente `OrderActionBar`:
- Ao lado do rótulo "Ações da OS", renderizar um botão pequeno vermelho "Excluir OS" (ícone `Trash2`), visível apenas quando `useUserRole()` indicar admin.
- Ao clicar: abrir `AlertDialog` (shadcn) confirmando "Excluir a OS #<número>? Esta ação é irreversível."
- Confirmar → chama `deleteServiceOrder` via `useServerFn`, mostra toast, invalida a query `service-orders` do React Query para atualizar a listagem.
- Estado de loading no botão; erros exibidos via `toast.error`.

Nenhuma alteração em rotas, wizard, dashboard, relatórios ou cálculos financeiros.

## Arquivos alterados
- Migração SQL (novo arquivo)
- `src/lib/api/serviceOrders.functions.ts` — adiciona `deleteServiceOrder`
- `src/components/ordens/ServiceOrderIslandRow.tsx` — botão + diálogo de confirmação
