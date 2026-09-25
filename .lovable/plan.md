# Adicionar técnico novo na apuração de horas da OS

## O que muda para o admin
Na etapa "Apuração de horas e valores" (Revisar e finalizar), aparece o botão **"+ Adicionar técnico"**, com duas opções:
- **Escolher técnico já cadastrado**: lista os técnicos ativos que ainda não estão na OS, com busca por nome.
- **Cadastrar novo técnico**: formulário curto com nome (obrigatório), função, telefone e valor/hora (opcional, já preenche a linha).

Ao confirmar, o técnico entra na OS e ganha uma linha de horário (data, início, fim, valor/hora) pronta para editar. Dá para adicionar mais linhas para ele como para os outros.

## Como passa para a OS e o PDF
- O técnico é vinculado à equipe da OS (não fica como "Histórico da OS"). Aparece no cabeçalho, na lista de técnicos e no controle de horas.
- As horas dele são gravadas junto com as outras na finalização, então o resumo financeiro, os relatórios por técnico e o PDF final mostram o nome, as horas e o valor dele.
- Se a apuração for cancelada antes de finalizar, o técnico continua vinculado, mas sem horas. Ele pode ser removido pela edição normal da equipe.

## Regras
- Só administradores. O sistema recusa técnicos e demais usuários.
- Não funciona em OS canceladas. Nas OS já aprovadas, só funciona pela reabertura/edição da apuração que já existe.
- O novo técnico não recebe login. O acesso continua sendo criado em Colaboradores.
- Os fluxos de deslocamento, materiais, assinatura e status continuam iguais.

## Detalhes técnicos
- Novo `AddTechnicianToLaborDialog.tsx`, com abas "Existente" e "Novo". Reaproveita `listTechnicians`, `createTechnician` e `addServiceOrderTechnicians` (que já exige `is_admin`).
- Em `FinalizeServiceOrderDialog.tsx`: o botão fica na etapa de apuração. Ao concluir, o técnico entra num estado local `extraTechs`, que é somado a `techs` (`mergeHistoryTechnicians`) para aparecer já no select de cada linha. Chama `addEntry(newTech.id)` com o valor/hora do cadastro e invalida `["service-order", id]`, `["order-history-technicians", id]` e `["technicians"]`.
- Nenhuma mudança no banco. A finalização já grava `service_order_labor_entries` por `technician_id`, e o PDF e os relatórios já leem dali.
- Validação: build, tsgo e Vitest, mais um teste pelo navegador numa OS de teste. Nele o admin adiciona um técnico novo, lança horas e finaliza. Depois conferimos o detalhe da OS e o total no PDF, e revertemos os dados de teste.
