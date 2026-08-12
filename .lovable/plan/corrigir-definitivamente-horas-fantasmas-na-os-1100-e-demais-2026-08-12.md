# Corrigir definitivamente horas fantasmas na OS #1100 e demais afetadas

## Diagnóstico confirmado

- A OS **#1100** foi finalizada e aprovada em **07/08**, com os apontamentos reais de **27 e 28/07** já consolidados.
- Em **12/08 às 15:15 (São Paulo)**, a leitura da apuração inseriu quatro linhas novas para João Gabriel Klein e Uilian Ramos Bastos:
  - 06/08, 16:09–23:59: 470 min para cada técnico;
  - 07/08, 00:00–09:41: 581 min para cada técnico.
- Essas linhas vieram de duas sessões contínuas de 1.051 minutos, abertas em 06/08 e encerradas automaticamente na finalização. Elas aumentaram a #1100 de **1.880 para 3.982 minutos** e de **R$ 290.000,00 para R$ 552.750,00** no total da OS.
- A varredura encontrou inserções posteriores ao encerramento também nas OS **#1086, #1089, #1095, #1096, #1098, #1099 e #1107**. As correções manuais recentes de #1073 e #1088 serão preservadas; cada candidata será validada contra sessões, fechamento e apontamentos anteriores antes de qualquer exclusão.

## Correção

### 1. Restaurar a OS #1100
- Remover somente as quatro linhas fantasmas criadas em 12/08 para 06 e 07/08.
- Manter integralmente os oito apontamentos reais de 27 e 28/07.
- Recalcular e persistir horas, custo de mão de obra, deslocamento e total geral.
- Marcar a apuração como consolidada para impedir nova materialização.
- Confirmar o resultado na tela, no PDF e nos relatórios: **31h20 de mão de obra**, **R$ 2.350,00 de horas**, **R$ 550,00 de deslocamento** e **R$ 2.900,00 total**.

### 2. Limpar as demais OS pelo mesmo padrão
- Auditar as linhas tardias das OS #1086, #1089, #1095, #1096, #1098, #1099 e #1107.
- Classificar como fantasma apenas a linha que foi criada automaticamente após a OS estar finalizada/aprovada e que não fazia parte da revisão consolidada.
- Preservar ajustes administrativos e correções intencionais, especialmente #1073 e #1088.
- Excluir somente as linhas confirmadas, recalcular os financeiros e consolidar cada OS corrigida.

### 3. Fechar definitivamente a origem
- Tornar qualquer OS finalizada, em revisão, aprovada, cancelada ou com financeiro finalizado estritamente somente leitura para materialização de horas.
- Remover do caminho de leitura qualquer fechamento de sessão ou escrita indireta: abrir “Apuração de horas”, OS, PDF ou relatório nunca poderá alterar dados.
- Bloquear também a sincronização acionada pelo histórico do técnico quando a OS já estiver encerrada, mesmo que `labor_entries_adjusted_at` antigo esteja vazio.
- Sessões contínuas acima do limite operacional ou atravessando a meia-noite sem pausa permanecem como pendência manual, nunca como apontamentos automáticos.

### 4. Proteção no banco
- Adicionar uma trava transacional para rejeitar novos apontamentos automáticos em OS encerradas/consolidadas, mantendo permitidas apenas alterações explícitas do fluxo administrativo autorizado.
- Garantir que a consolidação e o recálculo financeiro ocorram juntos, evitando totais parcialmente atualizados.
- Registrar a migração de forma compatível com as políticas e permissões atuais.

### 5. Testes e validação
- Cobrir regressões para: leitura sem escrita; OS finalizada sem append; sessão longa/multi-dia ignorada; sobreposição não duplicada; correção administrativa preservada; totais/PDF/relatórios coerentes.
- Repetir a varredura após a limpeza e confirmar que não restam linhas automáticas criadas após o fechamento.
- Abrir novamente a #1100 e outras amostras corrigidas para provar que os horários não reaparecem.

## Detalhes técnicos

- Ajustar os caminhos de `getOrderFinancials`, sincronização de sessões e fechamento automático para que escrita aconteça somente em comandos explícitos.
- Aplicar a limpeza de dados por IDs auditados, sem filtros amplos por data ou duração.
- Recalcular `service_order_financials` e os campos legados de `service_orders` a partir dos apontamentos preservados.
- Aplicar a proteção estrutural por migração e atualizar os testes de derivação/sincronização.
