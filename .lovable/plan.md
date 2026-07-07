## Objetivo
Tornar o campo `distance_km_from_base` **visível e acessível** na tela `/clientes/$id/editar`, sem redesenho, sem mexer em rotas, banco, criação de OS, finalização, PDF ou relatórios. O campo já existe end-to-end — a correção é de UX/descoberta.

## Escopo

### 1. `src/components/clientes/ClientUnitsEditor.tsx`
- **Auto-criar unidade principal implícita** quando o cliente não tem nenhuma unidade: em vez de mostrar só o empty-state, renderizar um card inline "Unidade principal" já aberto, com apenas os campos essenciais visíveis (Nome pré-preenchido com o nome do cliente + campo **Distância da base (km)**), e um botão "Salvar unidade". Assim o admin cadastra a distância mesmo sem "pensar em unidade".
- **Auto-expandir** a unidade quando o cliente tem exatamente 1 unidade (evita o clique extra que hoje esconde o campo).
- **Elevar o bloco "Deslocamento padrão"** para o topo do formulário da unidade (hoje fica no fim, depois de endereço/contato/observações). Ordem nova dentro do accordion: Nome + Principal → **Deslocamento padrão (Distância da base)** → CNPJ/Setor → Cidade/UF → Endereço → Contato → Observações.
- **Ajuste de labels/copy** conforme especificado:
  - Label: "Distância da base"
  - Sufixo visual "km" (adornment à direita do input)
  - Placeholder: "Ex.: 90"
  - Texto auxiliar: "Usada como sugestão de deslocamento na finalização das OS desta unidade."
  - Estado vazio no header da unidade colapsada: badge "Distância não definida" (quando `distance_km_from_base == null`) ou "90 km da base" (quando preenchido), para dar sinal visual imediato sem precisar abrir.

### 2. `src/routes/_app.clientes.$id.editar.tsx`
- **Adicionar âncora/atalho** no card principal: um pequeno chip/botão no cabeçalho "Editar cliente" com texto "Configurar distância da base" que faz `scrollIntoView` para a seção de unidades. Aparece somente quando alguma unidade está sem `distance_km_from_base`.
- Nenhuma outra alteração de layout, sem mexer em Identificação/Localização/Contato/Observações.

### 3. Verificações (sem alterações de código)
- Confirmar que `updateClientUnit` já persiste `distance_km_from_base` (já persiste — `draftToInput` inclui o campo).
- Confirmar que `FinalizeServiceOrderDialog` já consome `distance_km_from_base` da unidade + rate global (já consome, conforme implementação anterior).
- Confirmar que `client_units.distance_km_from_base` existe na tabela (existe, tipo `numeric`).
- Nenhuma migration nova. Nenhuma mudança em `types.ts`, `clients.functions.ts`, `types/client.ts`.

## Fora de escopo
- Banco de dados, migrations, tipos Supabase.
- Rotas, autenticação, wizard de criação de cliente (`ClientWizard`).
- Fluxo de criação/finalização de OS, PDF, relatórios.
- Redesenho visual — só reordenação dentro do accordion da unidade + um chip de atalho + auto-expand + inline unit para clientes sem unidade.
- Valor por km (segue global em `system_settings.default_displacement_rate_cents`).

## Validação manual
1. Abrir `/clientes/<Camira>/editar` — cliente sem unidade → aparece card "Unidade principal" já aberto com campo "Distância da base".
2. Digitar `90` → Salvar unidade → toast de sucesso → reabrir a rota → valor `90` persistido e visível no header ("90 km da base") e no campo.
3. Criar OS para Camira → abrir finalização → deslocamento sugerido automaticamente com `90 km` × rate global.
4. Confirmar que a tela de editar cliente não teve mudança em Identificação/Localização/Contato/Observações/Salvar.
5. Confirmar que nenhum campo de valor por km apareceu por cliente.
6. Confirmar que `ClientWizard` (criação) permanece inalterado.
