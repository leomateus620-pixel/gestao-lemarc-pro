
## Objetivo

Permitir vincular cada colaborador a um usuário do sistema pelo **e-mail de login** (em vez de colar UUID), para que toda OS em que ele estiver como técnico apareça automaticamente no painel dele — podendo abrir, editar, anexar fotos, coletar assinatura e finalizar. Já deixar o Marcio vinculado ao e-mail `lemarcmanutencao@gmail.com`.

## Como vai funcionar

1. **Cadastro/edição do colaborador → passo "Acesso"**
   - Trocar o campo atual "ID do usuário (UUID)" por um campo **E-mail do usuário do sistema**.
   - Ao salvar, o backend procura na tabela de perfis quem tem esse e-mail e grava o vínculo (`user_id`) no colaborador.
   - Se o e-mail ainda não tiver conta criada, mostra aviso pt-BR: "Nenhum usuário encontrado com este e-mail. Peça para o colaborador entrar uma vez em /login com este e-mail e tente novamente." (o trigger `handle_new_user` já cria o perfil no primeiro login).
   - Deixar em branco = remover vínculo.
   - Exibir no card de revisão o e-mail vinculado (não o UUID).

2. **Painel do técnico já funciona automaticamente**
   - `listServiceOrders` respeita RLS. A política de leitura em `service_orders` já usa `user_is_order_technician(id)`, que casa `auth.uid()` com `technicians.user_id`.
   - Portanto, assim que Marcio for vinculado, qualquer OS em que ele estiver em `service_order_technicians` aparece no Dashboard e na lista de OS dele, e ele pode abrir/editar/anexar fotos/pedir assinatura/finalizar dentro do fluxo padrão (as políticas já permitem que técnicos designados editem a OS e suas dependências).

3. **Vinculação inicial do Marcio**
   - Migration de dados: `UPDATE public.technicians SET user_id = (SELECT user_id FROM public.profiles WHERE lower(email)='lemarcmanutencao@gmail.com') WHERE lower(full_name) LIKE 'marcio%' AND user_id IS NULL;`
   - Se o perfil ainda não existir (Marcio nunca entrou), a migration não falha — só não vincula. Nesse caso, avisar ao usuário para o Marcio fazer login uma vez e depois refazer o vínculo pela tela.

## Detalhes técnicos

- **Server fn nova** em `src/lib/api/serviceOrders.functions.ts` (ou arquivo dedicado `technicianAccess.functions.ts`): `linkTechnicianUser({ technicianId, email })` com `requireSupabaseAuth` + checagem `is_admin`. Faz `select user_id from profiles where lower(email)=lower(:email)`. Retorna `{ user_id }` ou erro pt-BR. Se `email` vazio → seta `user_id=null`.
- **`updateTechnician`**: remover `user_id` do payload direto e delegar sempre ao `linkTechnicianUser` quando o campo mudar; ou continuar aceitando `user_id` mas resolvê-lo a partir do e-mail antes de gravar. Mais simples: novo campo `access_email` em `TechnicianInput`; o handler resolve para `user_id` no servidor. Manter `user_id` retro-compatível para não quebrar chamadas existentes.
- **`CollaboratorForm.tsx`**: no passo 3 ("Acesso"), substituir o `details` de UUID por um `Input` de e-mail (`accessEmail`). Draft passa a ter `accessEmail` (inicializado a partir de um lookup do e-mail do usuário vinculado — nova server fn `getTechnicianAccessEmail(technicianId)` chamada na página de edição, ou incluir no `TechnicianLite` um campo derivado `access_email`). Simples: incluir `access_email` no select de `listTechnicians`/`getTechnician` via join com `profiles`.
- **Migration**: apenas o `UPDATE` de dados descrito acima. Sem mudanças de RLS (as políticas já cobrem o caso).

## Fora de escopo

- Criar contas de auth para colaboradores (usuário ainda precisa entrar em `/login` uma vez para nascer o perfil).
- Alterar telas de OS, dashboard, assinatura ou fluxo do técnico — já funcionam via RLS assim que o vínculo existir.
- Alterar rota admin `/colaboradores` (permissões continuam iguais).

## Validação

- `bunx tsgo` limpo.
- Admin edita Marcio → passo Acesso mostra e-mail vazio (ou o atual), digita `lemarcmanutencao@gmail.com`, salva, vê "Usuário vinculado: lemarcmanutencao@gmail.com" na revisão.
- Login como Marcio → Dashboard e lista de OS mostram as OS onde ele é técnico; consegue abrir, editar, anexar foto, coletar assinatura e finalizar.
- Login admin continua vendo tudo.
