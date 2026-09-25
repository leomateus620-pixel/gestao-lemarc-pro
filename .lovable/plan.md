# Corrigir o nome do responsável sem trocar a assinatura

## 1. Correção da OS #1205
- Trocar o nome "Anderson" por "Adriano" na assinatura já registrada.
- A imagem da assinatura, a data, o cargo ("Gerente") e o código da assinatura continuam iguais.
- Guardar no registro da assinatura que o nome foi corrigido (nome anterior, quem corrigiu e quando).

## 2. Botão para o admin corrigir nas próximas vezes
- No quadro "Assinatura do responsável", ao lado de "Ver" e "Substituir", aparece "Editar nome" só para administradores.
- Abre uma janela pequena com os campos Nome e Cargo, já preenchidos. Ao salvar, só esses dados mudam.
- Técnicos não veem o botão, e o sistema bloqueia a alteração para quem não for admin.
- O PDF e a tela da OS mostram o nome novo na hora.

## Detalhes técnicos
- Dados: atualizar `signed_by_name` da assinatura `663cb0e1-5f67-4351-b8e1-b1a8da1a699c` e adicionar `metadata.name_corrections[]` com `{from, to, by, at}`.
- Nova função no servidor `updateSignatureSigner` em `src/lib/api/signatures.functions.ts`: exige login e papel admin (`has_role`), valida nome (2–120) e cargo opcional, altera apenas `signed_by_name`/`signed_by_role` e adiciona o histórico em `metadata`. Não mexe em `signature_path`, `signature_hash` nem `signed_at`.
- Interface: botão e janela em `src/components/ordens/signature/SignatureBlock.tsx`, que atualiza a OS depois de salvar.
