## Objetivo
Criar o acesso de login para **bebyalves68@gmail.com** e vinculá-lo ao colaborador já existente **OMAR ALVES**, seguindo exatamente o mesmo fluxo usado para os 10 técnicos anteriores.

## Situação atual (verificada)
- Colaborador `OMAR ALVES` existe, está ativo, **sem e-mail e sem conta vinculada**.
- Não existe conta de autenticação com o e-mail `bebyalves68@gmail.com`.
- Não há colaborador duplicado com esse nome ou e-mail.

## Passos
1. Criar a conta de acesso com o e-mail e a senha temporária informados, já confirmada para login imediato, com o nome "Omar Alves".
2. Conferir que o perfil e o papel de técnico foram criados automaticamente pelos gatilhos do sistema (mesmo comportamento dos usuários anteriores); completar manualmente caso algo falte.
3. Atualizar o colaborador OMAR ALVES existente: preencher o e-mail e vincular à nova conta — sem criar colaborador novo e preservando histórico, OS, horas e precificação.
4. Validar: login real funcionando, perfil ativo, papel de técnico, exatamente um colaborador vinculado, sem duplicados, e presença correta na lista de Colaboradores e na atribuição de OS.
5. Apagar os scripts temporários; a senha não será gravada em arquivos, logs, commits ou campos do banco.

## Observação
Continua sem troca obrigatória de senha no primeiro acesso (mesma condição dos demais usuários). Posso implementar depois, se desejar.

## Detalhes técnicos
- Conta criada via Supabase Auth Admin API com a service role key (o `psql` não acessa o schema `auth`).
- Vínculo feito por `UPDATE public.technicians SET user_id, email WHERE id = '26337dce-…'`, com guarda `user_id IS NULL` e verificação de ausência de duplicidade.
- Papel `tecnico` em `public.user_roles` (nunca em `profiles`/`technicians`).