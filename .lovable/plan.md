# Horas de vários técnicos na mesma OS: causa e correção

## O que a verificação mostrou (OS #1102)

Consultei os registros de tempo dessa OS no banco:

- Juan Rusch: dois registros fechados — 07:54→11:58 (pausa almoço) e 13:25→16:27 (encerrado). Ambos entraram na Apuração de horas.
- JOÃO GABRIEL KLEIN: um único registro iniciado 07:54 e **ainda em aberto** — nunca foi gravado nem a pausa nem o encerramento dele.

A Apuração de horas só considera registros fechados. Como o registro do João nunca fechou, ele não gerou linha, valor nem entrou no total da OS — exatamente a queixa.

Por que o encerramento dele não gravou: o cadastro "JOÃO GABRIEL KLEIN" **não está vinculado a nenhum login** (como outros 3 técnicos ativos). A regra de segurança do banco só permite fechar o tempo de um técnico se quem clica for o próprio técnico (vínculo login↔cadastro) ou um administrador. Sem vínculo, o clique em "Pausar"/"Encerrar meu tempo" atualiza zero registros — e hoje o sistema não avisa nada, trata como sucesso. É o "erro invisível".

Isso não é exclusivo da 1102: há **27 registros de tempo em aberto em 21 OS já fechadas**, todos com horas não contabilizadas.

## O que será feito

1. **Impedir que o clique falhe em silêncio**
   Pausar, retomar e encerrar passam a conferir se o registro foi realmente gravado. Se nada foi gravado, o técnico vê uma mensagem clara em vez de achar que deu certo.

2. **Encerrar/pausar deixa de depender do vínculo de login**
   A ação passa a ser autorizada no servidor (admin ou técnico vinculado à OS) e gravada com credencial de serviço — como já acontece em "encerrar tempo do colega". Funciona para qualquer técnico da OS, com ou sem login próprio, e continua bloqueada para quem não é da OS.

3. **Nenhuma OS pode ser finalizada com tempo em aberto**
   Ao finalizar/apurar, o sistema fecha os tempos ainda abertos no horário de encerramento da OS, avisa quais técnicos foram fechados e recalcula horas, valor/hora e total. Nada fica de fora.

4. **Apuração de horas sempre com todos os técnicos**
   A reconciliação passa a comparar por técnico: se existir tempo registrado de um técnico sem linha correspondente na apuração, a linha é criada. Ajustes manuais do admin continuam preservados.

5. **Cadastros sem login sinalizados**
   A tela de colaboradores passa a indicar quando o cadastro não tem login vinculado, para o admin corrigir. (Criar os logins em si só faço se você pedir.)

6. **Correção dos dados existentes**
   - OS #1102: o tempo do João é fechado espelhando o colega — 07:54→11:58 e 13:25→16:27 (7h06), com a taxa dele de R$ 75,00/h — e apuração, PDF e totais são recalculados.
   - As 21 OS antigas com tempo em aberto: cada registro é fechado no horário de encerramento da OS, com marcação de ajuste automático, e os totais recalculados. Te entrego a lista do que mudou.

## Detalhes técnicos

- `src/lib/api/timeSessions.functions.ts`: `pauseWork`/`resumeWork`/`finishWork` com `.select("id")` + erro explícito quando 0 linhas; escrita via `supabaseAdmin` após validar `has_role('admin')` ou `user_is_order_technician`.
- `src/lib/api/financials.functions.ts` (`finalizeServiceOrder`): fecha sessões abertas (`end_reason: 'finish'`, `adjusted_by`) antes de derivar as linhas; retorna a lista de técnicos afetados para aviso na UI.
- `src/lib/serviceOrders/laborSync.server.ts` / `laborDerivation.ts`: correspondência de segmentos faltantes por técnico, garantindo linha para todo técnico com tempo fechado.
- `src/components/ordens/ServiceOrderTimeControl.tsx` e `FinalizeServiceOrderDialog.tsx`: mensagens de erro reais e aviso discreto de tempos fechados automaticamente.
- Testes em `src/lib/serviceOrders/laborDerivation.test.ts` cobrindo dois técnicos simultâneos com pausa.
- Correção de dados (1102 + 21 OS) via ferramenta de dados, sem alterar schema.