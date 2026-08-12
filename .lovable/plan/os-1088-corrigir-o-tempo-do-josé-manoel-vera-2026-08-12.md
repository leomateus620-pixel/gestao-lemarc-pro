# OS #1088 — corrigir o tempo do José Manoel Vera

## O que está errado hoje

Verifiquei os registros de tempo da OS #1088:

- **Matheus**: 13 registros corretos, de 04/08 a 12/08, com pausas de almoço e fim de expediente. O último registro terminou em 12/08 às 07:54 (horário local) com pausa, ou seja, ele está **pausado** agora.
- **JOSÉ MANOEL VERA**: apenas **1 registro, aberto desde 04/08 às 08:20**, que nunca foi pausado nem encerrado. Por isso o cronômetro dele mostra centenas de horas corridas.

## Correção

Espelhar exatamente o histórico do Matheus para o José nesta OS:

1. Remover o registro aberto do José (04/08 08:20, sem fim).
2. Criar para o José uma cópia de cada um dos 13 registros do Matheus, com os mesmos início, fim, duração e motivo de pausa.
3. Deixar o José na mesma situação atual do Matheus: **pausado** (último registro encerrado em 12/08 às 07:54), sem tempo em aberto.
4. Recalcular as horas e os valores da OS para que a apuração passe a mostrar os dois técnicos com as mesmas horas trabalhadas.

Resultado esperado no controle de tempo: Matheus e José com o mesmo total de horas, ambos "Pausado", e o histórico da OS mostrando os dois com as mesmas pausas e retomadas.

## Detalhes técnicos

- Migração de dados: `DELETE` do registro aberto do José em `service_order_time_sessions` e `INSERT ... SELECT` a partir dos registros do Matheus da mesma OS, trocando `technician_id` (e marcando `metadata` como espelhamento administrativo, mantendo `source`).
- Limpar `labor_entries_adjusted_at` em `service_order_financials` desta OS para que a reconciliação automática (`laborSync` / `financials.functions.ts`) regenere as linhas de apuração incluindo o José na próxima abertura da apuração.
- Nenhuma mudança de regra de cálculo: só dados desta OS.
