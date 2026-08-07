# Criar login do João Gabriel Klein e vincular ao cadastro

## O que existe hoje

- O colaborador "JOÃO GABRIEL KLEIN" está cadastrado e ativo, com taxa de R$ 75,00/h, mas **sem login vinculado** — foi exatamente isso que fez as horas dele na OS 1102 não serem contabilizadas.
- O e-mail no cadastro dele hoje é `kleingabriel2.0@gmail.com`, diferente do novo acesso solicitado.

## O que será feito

1. Criar o usuário `joao.gabriel.klein1@gmail.com` com a senha informada, já confirmado (sem necessidade de confirmar e-mail), com nome "João Gabriel Klein".
2. Atribuir a ele o papel de **técnico** (sem acesso a Leitos Aramados, seguindo a regra atual).
3. Vincular esse login ao cadastro do colaborador "JOÃO GABRIEL KLEIN", para que pausar/encerrar tempo, notificações e OS atribuídas funcionem no nome dele.
4. Atualizar o e-mail do cadastro do colaborador para o novo endereço, mantendo o restante (taxa, função, dados) intacto.
5. Verificar depois da criação que o vínculo está ativo e que a marcação "Sem login vinculado" desapareceu na lista de colaboradores.

## Detalhes técnicos

- Usuário criado via Admin API (`email_confirm: true`), papel inserido em `public.user_roles` como `tecnico`.
- `public.technicians.user_id` do registro `46c90c8b…` passa a apontar para o novo `auth.users.id`; `technicians.email` atualizado para `joao.gabriel.klein1@gmail.com`.
- Sem alterações de schema, RLS ou código — apenas dados.
