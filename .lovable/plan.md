## Causa raiz

`src/routes/_app.colaboradores.$id.tsx` é registrado como **layout pai** de todas as rotas filhas (`/editar`, `/horas`, `/ordens`, `/precificacao`), porque no roteamento flat do TanStack Router qualquer arquivo `foo.$id.tsx` com irmãos `foo.$id.<algo>.tsx` vira layout. Como seu `component: ColaboradorPerfilPage` não chama `<Outlet />`, o filho monta mas nunca aparece na tela. Ao navegar para `/colaboradores/:id/editar` você continua vendo o perfil, sem nenhum campo editável e sem erro no console — exatamente o "erro silencioso" que você descreveu.

O mesmo padrão em `clientes` já funciona porque lá existe `_app.clientes.$id.index.tsx` (perfil como index, sem virar layout).

## Correção

1. **Renomear** `src/routes/_app.colaboradores.$id.tsx` → `src/routes/_app.colaboradores.$id.index.tsx`. Nenhuma outra mudança de conteúdo — o `createFileRoute("/_app/colaboradores/$id")` é gerado a partir do nome e passa a ser rota index (não-layout).
2. **Não criar** arquivo `_app.colaboradores.$id.route.tsx`. As filhas (`editar`, `horas`, `ordens`, `precificacao`) passam a ser rotas irmãs independentes, cada uma com seu próprio `AppShell` — comportamento já esperado por elas hoje.
3. O `routeTree.gen.ts` é regenerado automaticamente pelo plugin do Vite.

## Verificação

Rodar Playwright autenticado navegando para `/colaboradores/536c0e43-1031-42d6-a9dd-74240c134528/editar` e confirmar:
- Aparecem os inputs do wizard (Nome, Telefone, E-mail, CPF...).
- Preencher um campo → estado atualiza (`document.querySelectorAll('input').length > 0`).
- Salvar → volta ao perfil e mostra o valor novo.
- Rotas irmãs continuam funcionando: `/precificacao`, `/horas`, `/ordens`.
- Perfil em `/colaboradores/:id` continua abrindo normalmente (agora como index).

Nada mais é tocado. Fluxos de OS, tempo, pausa, finalização, assinatura, anexos, PDF, relatórios e financeiro seguem intactos.

## Arquivos alterados

- Renomear `src/routes/_app.colaboradores.$id.tsx` → `src/routes/_app.colaboradores.$id.index.tsx` (conteúdo inalterado).
