## Plano

1. **Liberar edição direta da Apuração de horas**
   - Remover a dependência de “abrir o resumo financeiro” para consolidar os apontamentos.
   - Ajustar a busca financeira para sempre entregar linhas persistidas/editáveis quando houver sessões de tempo fechadas.
   - Quando ainda não houver registro financeiro, criar/atualizar o resumo necessário sem exigir que o administrador abra o modal antes.

2. **Corrigir exclusão/edição sem erro invisível**
   - Revisar `updateLaborEntry` e `deleteLaborEntry` para validar se a operação realmente afetou uma linha.
   - Retornar mensagens claras quando a linha não existir, estiver inconsistente ou não puder ser alterada.
   - Após salvar/excluir, invalidar também os dados da OS individual, relatório/PDF e resumo financeiro para a tela não voltar a exibir o item excluído.

3. **Evitar que a leitura recrie horários excluídos**
   - Separar o comportamento de “gerar apontamentos a partir das sessões” do comportamento de “respeitar ajustes manuais”.
   - Depois que o administrador editar/excluir/adicionar uma linha na Apuração de horas, a lista persistida passa a ser a fonte correta para PDF, valores e relatórios, sem recriar automaticamente o horário apagado a partir do histórico bruto de sessões.

4. **Fluxo visual após alterações**
   - Manter o usuário na seção de Apuração de horas após editar/excluir, sem abrir modal inesperado.
   - Adicionar logo abaixo dessa seção um CTA claro de **“Revisar e finalizar OS”**, usando o mesmo fluxo existente de fechamento.
   - Garantir que o botão só apareça para administrador quando a OS ainda puder ser revisada/finalizada.

5. **Validação final**
   - Conferir no pedido atual que os apontamentos aparecem editáveis sem mensagem de bloqueio.
   - Confirmar que excluir uma linha remove da tela, recalcula totais e não reaparece em seguida.
   - Conferir que os dados usados pelo PDF/relatórios vêm dos apontamentos ajustados.