# Login Lemarc com identidade visual industrial

## Resultado
A tela deixa de ser um fundo branco liso e passa a usar a identidade da marca (azul-marinho profundo + laranja Lemarc), mantendo o formulário simples, rápido e legível no celular.

## Visual proposto
```text
+--------------------------------------------+
| fundo azul-marinho com degradê suave,      |
| grade técnica sutil e brilho laranja no    |
| canto; engrenagem da marca em marca-d'água |
|                                            |
|            [ logo Gestão Lemarc ]          |
|   +------------------------------------+   |
|   |  Entrar                            |   |
|   |  Acesse sua operação               |   |
|   |  [ Ordens de Serviço | Leitos ]    |   |
|   |  E-mail  [__________]              |   |
|   |  Senha   [__________]  (olho)      |   |
|   |  [ ENTRAR (laranja) ]              |   |
|   |  Acesso administrador              |   |
|   +------------------------------------+   |
|   Industrial · OS Digital                  |
+--------------------------------------------+
```
- Fundo: navy escuro com degradê radial (brilho laranja discreto no topo/canto), grade fina de linhas estilo desenho técnico e faixa laranja de acento. Estático (sem animação pesada), bom para celulares fracos.
- Cartão do formulário: superfície clara (modo claro) ou navy elevado (modo escuro), bordas arredondadas, sombra e linha laranja fina no topo; logo fica acima do cartão sobre o fundo escuro, sem moldura própria.
- Rodapé discreto com "Industrial · OS Digital".
- Modo claro: mesmo fundo da marca com cartão branco; modo escuro: cartão navy. Contraste mínimo AA, alvos de 48px+ e foco laranja visível mantidos.
- Respeita "reduzir movimento"; sem imagens novas pesadas (tudo em CSS).

## Arquivos
- `src/styles.css`: só o bloco `.login-clean*` (fundo, cartão, tokens de cor do login, marca-d'água em CSS).
- `src/routes/login.tsx`: apenas marcação de apresentação (envolver o conteúdo em cartão, ajustar logo/rodapé). Nenhuma lógica alterada.

## Não muda
Autenticação, timeouts, saída local, 30 dias, `isGoogleSession`, bloqueio Google, Operação padrão "Ordens de Serviço", mensagens de erro, avisos de senha, acesso administrador, banco e papéis. Testes e2e do login continuam válidos (ids e papéis preservados).

## Verificação
Capturas no preview em celular (390px) e desktop, claro e escuro; testes unitários e tipos; não publicar.

## Pergunta em aberto
Fundo escuro com cartão claro (proposta, mais impacto de marca) ou fundo claro azulado com detalhes laranja (mais discreto)? Se não houver preferência, sigo a proposta.
