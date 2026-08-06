# Horas apuradas pelo admin refletidas no Controle de tempo da OS

## O que muda

Hoje o bloco "Controle de tempo da OS" (visto pelo técnico e pelo admin) soma as horas
diretamente das sessões de cronômetro. Se o admin corrigir os horários em
"Apuração de horas", o cartão do técnico continua mostrando o valor antigo.

Passa a funcionar assim:

- Enquanto o admin **não** editar a apuração, nada muda — o cartão segue mostrando o
  cronômetro real, ao vivo.
- Assim que o admin editar/excluir/adicionar um apontamento e salvar, o
  "Controle de tempo da OS" passa a exibir as **horas apuradas** por técnico e o
  total apurado, com um selo "Horas ajustadas pelo admin" e a data do ajuste.
- O histórico bruto (início, pausa, retomada, finalização) continua intacto e visível,
  como registro do que foi apontado em campo.
- Sessão em andamento continua contando ao vivo, sem sobrescrita, para não travar o
  cronômetro de quem está trabalhando.
- Vale automaticamente para todas as OS cuja apuração já foi editada — nenhuma
  migração de dados é necessária, já existe a marca de ajuste no banco.

## Detalhes técnicos

1. **Novo server fn** `getOrderLaborOverride` em `src/lib/api/timeSessions.functions.ts`
   (`requireSupabaseAuth`): valida que o usuário é admin ou técnico da OS e retorna
   `{ adjustedAt, adjustedBy, minutesByTechnician, totalMinutes }` a partir de
   `service_order_financials.labor_entries_adjusted_at` e do agrupamento de
   `service_order_labor_entries` por `technician_id`. Retorna `adjustedAt: null`
   quando não houve ajuste do admin.
   Conferir/ajustar leitura via RLS para técnico da OS (usar
   `user_is_order_technician`); se as policies atuais de
   `service_order_labor_entries` não permitirem leitura pelo técnico, a fn faz o
   agrupamento server-side com verificação explícita de acesso.

2. **`ServiceOrderTimeControl.tsx`**: consulta o override (`useQuery`, chave
   `["order-labor-override", order.id]`, invalidada junto com as demais).
   Quando `adjustedAt` existe, o "Total trabalhado" e o "Trabalhadas: HH:mm" de cada
   técnico usam `minutesByTechnician`; se o técnico não tiver apontamento apurado,
   mostra `00:00`. Técnico com sessão aberta continua somando o tempo ao vivo por
   cima do valor apurado.

3. **Selo/aviso** no cabeçalho do cartão: "Horas ajustadas pelo admin em dd/mm às HH:mm",
   com texto curto explicando que os valores oficiais vêm da apuração.

4. **Invalidação**: as mutações de `LaborEntriesEditor` (update/delete/create) passam a
   invalidar também `["order-labor-override", orderId]` e
   `["order-time-sessions", orderId]`, para o cartão atualizar na mesma tela.

Nada muda no cálculo de PDF, relatórios ou financeiro — eles já leem a apuração.
