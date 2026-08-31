# Corrigir definitivamente a edição de horários e o corte no mobile

## Objetivo

Garantir que o texto digitado nunca seja apagado enquanto o cronômetro atualiza, simplificar os campos repetidos e permitir concluir toda a revisão em telas pequenas sem conteúdo ou botões cortados.

## Alterações

### 1. Preservar o texto digitado

- Em `src/components/ordens/EditTimeSessionSheet.tsx`, controlar a inicialização do formulário por uma identidade estável da abertura (sessão + modo criar/editar), sem reinicializar o rascunho por renderizações do componente pai, atualização do cronômetro, refetch ou mudança da lista de técnicos.
- Manter início, fim, técnico e motivo digitados até o usuário salvar ou fechar explicitamente o modal.
- Em `src/components/ordens/TimeReviewDialog.tsx`, isolar a atualização visual do cronômetro para que o tique de 1 segundo não rerenderize toda a árvore do formulário de edição.

### 2. Remover campos e textos redundantes

- No modal de edição, manter apenas um campo obrigatório chamado **“Motivo do ajuste”**, usado para a auditoria da alteração.
- Remover o campo separado **“Observações da pausa”**; o seletor **“Motivo da pausa”** continua disponível quando aplicável, e observações já gravadas não serão apagadas do banco.
- Remover da tela principal de revisão o campo **“Observação (opcional)”**, evitando uma terceira área de texto com finalidade semelhante.
- Encurtar as descrições do cabeçalho e retirar avisos repetitivos, mantendo apenas as informações necessárias para revisar os horários e entender quando há cronômetro ativo.

### 3. Corrigir o layout mobile dos dois modais

- Em `src/components/ordens/TimeReviewDialog.tsx` e `src/components/ordens/EditTimeSessionSheet.tsx`, limitar a altura à área visível com unidades dinâmicas de viewport e safe area.
- Organizar cada modal em cabeçalho fixo, conteúdo central rolável e rodapé sempre acessível.
- Manter **“Confirmar horários e continuar”**, **“Salvar ajuste”**, **“Voltar”** e **“Cancelar”** completamente visíveis e clicáveis, inclusive com teclado virtual aberto.
- Ajustar cards e linhas de intervalos para larguras pequenas sem truncar ações essenciais.

## Validação

- Usar cronômetro simulado/ativo por mais de 10 segundos e confirmar que o motivo, datas e seleção permanecem intactos durante os tiques e refetches.
- Abrir edição de intervalo pausado e confirmar que existe somente um campo de justificativa do ajuste.
- Testar revisão e edição em viewport mobile, rolando do início ao fim e confirmando que o rodapé permanece acessível sem conteúdo cortado.
- Repetir o fluxo no desktop e validar criação, edição, salvamento, auditoria, recálculo e avanço para assinatura.
- Rodar os testes existentes e adicionar uma verificação focada na preservação do rascunho durante as atualizações do cronômetro.

## Detalhes técnicos

A alteração será apenas no fluxo e na apresentação dos diálogos. As regras atuais de permissão, vínculo dos técnicos, bloqueios de OS, auditoria e recálculo de horas permanecem inalteradas.
