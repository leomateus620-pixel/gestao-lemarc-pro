## Diagnóstico

O menu inferior (`BottomNav`) hoje faz:

```tsx
const visibleItems =
  loading || !isTecnico ? items : items.filter((i) => TECNICO_ROUTES.has(i.to));
```

Enquanto `useUserRole()` está `loading = true` (uma consulta a `user_roles` em cada navegação/refresh), o técnico vê a **barra completa** com Ordens, Clientes, Colaboradores, Relatórios e Mais; assim que o papel resolve, tudo colapsa para só "Início". É o "flash" e a sensação de instabilidade que aparece a cada rota, refresh e retorno de app em background. Além disso, a lista atual só tem `/dashboard` para técnico, o que impede o técnico de acessar suas OS pelo menu.

## Correção

1. **BottomNav** (`src/components/app/BottomNav.tsx`):
   - Durante `loading`, tratar o usuário como técnico (renderizar apenas os itens permitidos ao técnico). Isso elimina o flash — o pior caso vira "mostrei só Início e depois liberei mais itens quando confirmado admin", nunca o inverso.
   - Trocar `TECNICO_ROUTES` para incluir os itens que fazem sentido no fluxo do técnico: `/dashboard` e `/ordens` (para ele acompanhar/abrir/finalizar as OS). Continuam ocultos: Clientes, Colaboradores, Relatórios, Mais.
   - Recalcular `grid-template-columns` com `visibleItems.length` (já feito) para o layout ficar centralizado com 1 ou 2 itens.

2. **Cache do papel** (`src/hooks/useUserRole.ts`):
   - Guardar o resultado por `user.id` numa constante de módulo (mapa) para que, ao navegar entre rotas, o hook retorne imediatamente `loading=false` com o papel já conhecido, evitando refetch em toda montagem. Invalidar no `SIGNED_OUT`.
   - Manter o comportamento seguro: `isTecnico` só é `true` quando o papel foi confirmado (não é o default sob loading).

3. **Sem mudanças** em rotas, RLS, ou outros componentes.

## Resultado esperado

- Técnico (Marcio) em qualquer rota / refresh: menu inferior mostra somente **Início** e **Ordens**, sem piscar os demais itens.
- Admin continua vendo os 6 itens; no primeiríssimo carregamento pode ver só os 2 do técnico por uma fração de segundo até o papel resolver, mas nunca o contrário.
- Navegação entre páginas dentro da mesma sessão fica instantânea (papel cacheado).

## Validação

- Login Marcio → recarregar `/dashboard`, `/ordens`, entrar em uma OS: barra sempre com 2 itens, sem flash.
- Login admin → barra com 6 itens após o load inicial; navegações subsequentes sem refetch.
