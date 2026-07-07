## Objetivo

Adicionar deslocamento estável com **distância por unidade** (já existe) e **valor por km global** (novo), pré-preenchendo a finalização da OS automaticamente sem quebrar fluxos atuais.

## 1. Banco de dados (migração)

Coluna `client_units.distance_km_from_base` já existe — reutilizar.

Criar tabela global de configurações:

```sql
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer usuário autenticado (técnicos só leem valor por km durante uso interno; UI não expõe)
CREATE POLICY "Read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE: apenas admin
CREATE POLICY "Admin manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
```

Chave usada: `default_displacement_rate_cents`, valor `{ "cents": 250 }` (R$ 2,50).

Observação: campo legado `client_units.default_displacement_rate_cents` fica intocado (não usaremos mais na UI, mas não removemos para não quebrar código atual).

## 2. Server functions

**Novo** `src/lib/api/systemSettings.functions.ts`:
- `getDisplacementRateCents()` — `requireSupabaseAuth`, retorna `number | null`.
- `setDisplacementRateCents({ cents })` — `requireSupabaseAuth` + checa `has_role('admin')`, faz upsert.

**Editar** `src/lib/api/clients.functions.ts`:
- Garantir que `updateUnit` já persiste `distance_km_from_base` (verificar; ajustar se faltar).

## 3. UI — Configurações globais (admin)

Criar rota admin-only `src/routes/_app.configuracoes.tsx` (guarded via `requireAdmin`) com um único card **"Deslocamento padrão"**:
- Campo "Valor padrão por km" (input BRL, R$ 2,50 → 250 cents).
- Texto: "Este valor será aplicado para todos os clientes e unidades."
- Botão Salvar.

Adicionar entrada no menu "Mais" (`src/routes/_app.mais.tsx`) visível somente para admin: **"Configurações"**.

## 4. UI — Edição de cliente/unidade

Em `src/components/clientes/ClientUnitsEditor.tsx`:
- Manter/expor claramente o campo **"Distância da base (km)"** dentro de cada unidade (já existe estrutura, garantir label + persistência).
- Adicionar hint discreto: "O valor por km é configurado globalmente nas configurações do sistema."
- **Remover da UI** os campos por-unidade `default_displacement_rate_cents` e `default_displacement_type` (banco mantém, UI não expõe). Se aparecerem no `ClientWizard.tsx`, remover também.

## 5. Finalização da OS

Em `FinalizeServiceOrderDialog.tsx`, no efeito de hidratação (quando **não há** financeiro existente e `displacement.type === "none"`):

- Buscar `getDisplacementRateCents()` via `useQuery` (enabled quando dialog abre).
- Se `order.client_unit?.distance_km_from_base > 0` e `globalRate > 0`:
  - `type = "per_km"`, `km_total = distância`, `rate_input = BRL(globalRate)`.
- Exibir Notice: "Deslocamento sugerido com base na distância cadastrada da unidade e no valor padrão por km."
- Se distância presente mas rate global ausente (admin): Notice warning "Valor padrão por km não configurado."
- Admin ainda pode editar manualmente (comportamento atual preservado).

Não pré-preencher se já existe `service_order_financials` salvo.

## 6. Permissões / restrições

- Técnico **não** vê a rota `/configuracoes` nem a entrada de menu.
- Técnico **não** vê o diálogo de finalização (já é restrito hoje) — nada muda.
- RLS: técnico pode `SELECT` de `system_settings` (leitura silenciosa se algum fluxo interno precisar), mas UI não expõe.

## 7. Validação

- Editar unidade Camira → 90 km → salvar → recarregar → persistiu.
- Configurações → R$ 2,50/km → salvar → recarregar → persistiu.
- Criar OS Camira → admin finaliza → step Deslocamento já mostra 90 km, R$ 2,50, total R$ 225,00.
- Editar manualmente valores → totalização atualiza.
- OS sem distância → comportamento atual inalterado.
- Rotas `/clientes*`, `/ordens*`, relatórios, PDF, auth intactos.

## Detalhes técnicos

- Cents salvos como inteiro em `jsonb` (`{ "cents": 250 }`).
- Parse BRL usa `parseBRLToCents` existente.
- `getDisplacementRateCents` faz `select value->>'cents'` e converte para número, null se ausente.
- Hidratação da OS: usar `useQuery` com `queryKey: ["system-settings", "displacement-rate"]` e aguardar antes de resetar `displacement` (efeito atual roda em `open, existing, order, techs, sessions` — adicionar `globalRate` na dep).