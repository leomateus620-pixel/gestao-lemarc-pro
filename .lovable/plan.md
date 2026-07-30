## Objetivo

Criar/completar 10 contas de acesso (e-mail + senha temporária), com perfil, papel `tecnico` e vínculo com o colaborador correto no menu "Colaboradores" — sem alterar a arquitetura de autenticação nem dados de OS.

## Situação atual verificada

Contas de autenticação existentes hoje: 8 (nenhum dos 10 e-mails solicitados existe). Colaboradores existentes relevantes (consulta feita na base):

| Usuário solicitado | Colaborador existente | Ação |
|---|---|---|
| José Manuel — manuelverajose2021@gmail.com | JOSÉ MANOEL VERA (sem e-mail, sem user_id) | vincular + preencher e-mail |
| Sebastian — marquxz.s@gmail.com | SEBASTIAN MARQUXS | vincular + preencher e-mail |
| Uilian — uilian.urb@gmail.com | UILIAN RAMOS BASTOS | vincular + preencher e-mail |
| Ricardo — rmckoscrevic@gmail.com | Ricardo (sem e-mail, sem user_id) | vincular + preencher e-mail |
| Juan Grellmann | nenhum (o "Juan Rusch" existente é outra pessoa, já vinculada a outra conta) | criar colaborador |
| Matheus, Rodimir, Rudinilson, Valdir, Vinicius | nenhum | criar colaborador |

Nenhum colaborador existente será renomeado, excluído ou terá horas/OS/precificação alteradas.

## Execução

1. **Contas de acesso** — criar as 10 contas pela API administrativa oficial do backend, com e-mail já confirmado (login imediato por e-mail/senha). Senhas apenas em memória durante a execução: nunca gravadas em arquivos, migrações, logs ou no perfil.
2. **Perfis** — garantir um perfil por conta com nome completo e e-mail corretos (criar se o gatilho automático não tiver criado; atualizar o nome caso já exista).
3. **Papel** — inserir `tecnico` em `user_roles` de forma idempotente (sem duplicar, sem remover papéis existentes).
4. **Colaboradores** — para cada usuário: buscar por e-mail; se não achar, buscar por nome normalizado (sem acentos, caixa única); se achar, vincular `user_id` e completar o e-mail; se não achar, criar colaborador ativo com nome e e-mail. Cada conta fica com exatamente 1 colaborador, e cada colaborador com no máximo 1 conta.
5. **Validação** — consulta final conferindo, por usuário: conta existe, perfil correto, papel `tecnico`, exatamente 1 colaborador vinculado, colaborador ativo (portanto visível na lista de Colaboradores e na seleção de técnico da OS). Teste de login real por e-mail/senha para confirmar autenticação.

## Troca de senha no primeiro acesso

A arquitetura atual não possui fluxo de "senha temporária obrigatória". Para não alterar a arquitetura de autenticação (como pedido), as senhas serão definidas como informadas e a orientação será trocar a senha manualmente. Se quiser, posso depois adicionar uma tela de troca obrigatória no primeiro acesso — é uma mudança separada.

## Detalhes técnicos

- Criação das contas via API Admin do Supabase Auth executada no sandbox (chave de serviço já disponível no ambiente), com `email_confirm: true`.
- Perfis/papéis/colaboradores gravados via operações de dados idempotentes (upsert por e-mail/`user_id`), sem migração de schema — nenhuma tabela, política ou trigger é alterada.
- Vínculo feito em `technicians.user_id`, o mesmo relacionamento usado pelos fluxos de OS e pelo `useUserRole`.

## Entrega

Relatório final por usuário: nome, e-mail, colaborador (encontrado/criado), status do vínculo, status do papel, resultado do teste de login e eventuais erros.
