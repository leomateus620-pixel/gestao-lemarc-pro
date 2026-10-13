# Login Lemarc mais limpo e rápido

## Objetivo e escopo
Reorganizar somente a apresentação do login e as preferências visuais necessárias, preservando a autenticação e o acesso aos módulos. Nenhuma implementação ou publicação antes da aprovação; nenhuma mudança de banco, identidades, papéis ou dados.

A leitura confirmou que o login hoje exibe Google diretamente, dois cartões de operação e o ilustrativo “Fluxo da ordem de serviço”; já possui mostrar senha, formulário com Enter, autocomplete e preferência de módulo. A proposta simplifica esses elementos, sem substituir os fluxos de entrada.

## Layout mobile-first
Uma coluna, sem card externo decorativo, com largura máxima de aproximadamente 420 px e margens de 16–24 px. Ordem:
1. **Logo Lemarc existente**, visível no primeiro trecho da tela, com largura de aproximadamente 220–280 px e altura proporcional reservada para evitar saltos.
2. **Título curto “Entrar”**, Archivo 24 px; sem slogans, textos promocionais ou selos repetidos. Inter para campos e mensagens.
3. **Operação:** seletor segmentado “Ordens de Serviço / Leitos Aramados”, sem descrições ou cartões internos. Altura mínima de 48 px, rótulos completos, quebra de linha se necessária e seleção claramente marcada.
4. **E-mail** e **Senha**, com rótulos persistentes, texto de 16 px e campos de 52 px. Olho para mostrar/ocultar senha com alvo de 48 × 48 px, nome acessível e sem enviar o formulário.
5. **Entrar**, botão laranja de largura total e altura de 52 px.
6. **Mensagens de acesso/sessão e recuperação**, somente quando necessárias, próximas ao formulário.
7. **“Acesso administrador”**, opção textual discreta com área de toque mínima de 48 px. Nenhuma menção a Google na apresentação padrão.

Remover do login o ilustrativo “Fluxo da ordem de serviço”, inclusive no desktop: não apenas esconder no celular. Retirar desse login inclinação por movimento, animação de entrada com atraso, brilhos e camadas de blur. Não apagar componentes/estilos compartilhados sem necessidade. Formulário disponível imediatamente, sem esperar efeitos visuais ou fontes externas.

A tela deve rolar naturalmente quando o teclado estiver aberto, sem cortar botões ou mensagens. Respeitar as áreas seguras do app instalado e não forçar foco automático que abra o teclado ao entrar na página.

### Estados
- **Inicial:** formulário direto, operação lembrada quando disponível; manter a precedência atual: módulo na URL → destino solicitado → preferência salva. Sem preferência/destino, exigir seleção como hoje, sem alterar o comportamento de autorização.
- **Enviando:** botão com indicador leve e “Entrando…”; validação posterior com “Validando acesso…”. Preservar proteção contra envio duplicado e guarda de `finishAuthentication`; manter dimensões estáveis.
- **Erros de preenchimento:** mensagem ao lado/abaixo do campo correspondente, `aria-invalid` e `aria-describedby`; foco no primeiro campo inválido. Não indicar qual credencial está errada: “E-mail ou senha inválidos” permanece mensagem conjunta junto ao botão.
- **Rede, acesso ao módulo e sessão expirada:** preservar significado e textos existentes, em área anunciada por `role="alert"`/região acessível, sem informação sensível.
- **Sessão ativa:** preservar “Continuar” e “Entrar com outra conta”, usando o mesmo layout compacto e seletor.
- **Espera longa:** conservar o botão “Limpar sessão e tentar de novo” após 10 s e a recuperação atual de falha na leitura da sessão; alvos de pelo menos 48 px. Nenhuma limpeza automática por rede lenta/offline.

## Desktop e identidade
Mesmo formulário em uma coluna centralizada, largura de 400–440 px, com logo acima e mais espaço ao redor; sem divisão ilustrativo/formulário. Não ampliar exageradamente os campos em monitores largos.

Preservar logo, azul-marinho escuro, laranja e Archivo/Inter já definidos no projeto. Usar tokens semânticos, com tokens de login isolados quando necessário, sem alterar o tema do restante do app. Formulário/superfície acompanham o tema existente; no modo claro, superfície clara com textos escuros e marca marinho/laranja; no escuro, superfície marinho com textos claros. Não adicionar seletor de tema nem nova imagem. Validar o logo existente em ambos os fundos. Contraste mínimo de 4,5:1 para texto comum e 3:1 para limites/indicadores relevantes; foco visível e seleção indicada também sem depender apenas de cor.

## Como o administrador chega ao Google
**Recomendação: opção secundária explícita, sem lembrar o papel no aparelho.**
- Em `/login`, “Acesso administrador” revela uma área compacta com “Entrar com Google”, esclarecimento curto de acesso exclusivo de administradores e opção de voltar ao acesso padrão. E-mail/senha continuam disponíveis.
- Aceitar também `/login?admin=1` como atalho que abre a mesma área, preservando `module` e `redirect`. Admins podem salvar esse endereço nos favoritos. Não criar uma segunda página.
- O parâmetro só controla a apresentação: não marca `lemarc:auth-google-pending`, não identifica ninguém como admin e não concede acesso. O aviso de Google continua sendo marcado apenas por `handleGoogle`.
- Preservar `isGoogleSession`, consulta a `user_roles`, bloqueio de técnicos via Google e saída com `scope: 'local'`.
- Não gravar “último usuário admin” nem inferir papel por e-mail: em aparelhos compartilhados, isso poderia expor Google para o próximo técnico. Apenas expandir a opção não inicia login nem consulta papéis.

**Limite importante:** antes do login, não é possível saber com segurança se a pessoa é técnica. Técnicos não verão botão/aviso Google na tela padrão, mas poderão abrir voluntariamente o acesso secundário ou sua URL; a autorização atual continuará bloqueando a entrada pelo Google.

## Preferência e preenchimento automático
- Reutilizar a preferência `lemarc.preferred-module`, gravando a última operação selecionada e mantendo a gravação existente após acesso validado. Preferência é conveniência, nunca autorização.
- Tornar leitura/escrita tolerantes a armazenamento indisponível: a página continua funcionando sem lembrar a escolha. Não salvar e-mail, senha, papel ou dados de sessão nessa preferência.
- Preservar `id` dos campos; adicionar `name="email"` e `name="password"`. E-mail: `type="email"`, `inputMode="email"`, `autoComplete="username"`, sem capitalização/correção automática. Senha: `autoComplete="current-password"`.
- Manter formulário real e botão submit para Enter e gerenciadores de senha. Não usar placeholders no lugar de rótulos.

## Arquivos previstos e detalhes técnicos
- `src/routes/login.tsx`: layout, estados visuais, seletor compacto, atributos de formulário e validação do parâmetro `admin`. Retirar imports do ilustrativo e da física do card. Completar metadados específicos do login no `head()` desse arquivo.
- `src/styles.css`: ajustes/tokens de login estritamente isolados; não mudar estilos globais dos outros módulos.
- `src/lib/auth/loginPresentation.ts` **(novo)**: pequena regra pura e testável para abertura do acesso administrativo pelo parâmetro/ação explícita; sem sessão, identidade ou papel.
- `src/lib/auth/loginPresentation.test.ts` **(novo)**: testes dessa regra.
- `src/lib/modules.ts`: tolerância a armazenamento indisponível na preferência existente; sem mudar destinos ou autorização.
- `src/lib/modules.test.ts`: testes de persistência/recuperação e precedência se extraída para helper.
- `AGENTS.md`: registrar apenas a separação entre preferência de apresentação e autorização, caso a nova separação estrutural seja criada.

**Não alterar:** `AuthContext.tsx`, `sessionPolicy.ts`, `withTimeout.ts`, cliente de auth gerado, APIs de acesso, componentes UI globais, OS/horas/apuração e componentes de outros módulos. Não criar tabela, migração ou configuração de Auth.

Preservar literalmente os limites atuais: 15 s login/acesso/getSession, 8 s leitura inicial no `/login`, limpeza disponível após 10 s; `signOut` local; regra dos 30 dias; `isGoogleSession`; guarda de finalização; mensagens de sessão expirada; destino seguro por módulo e restrições de Leitos.

## Validação após aprovação
- Testes unitários de lógica: acesso admin fechado por padrão; `admin=1` abre; valores inválidos não abrem; expandir não equivale a autenticar; preferência recuperada; escolha substitui preferência anterior; valor inválido ignorado; leitura/escrita indisponível não impede uso; precedência URL/destino/preferência preservada.
- Rodar os testes novos, os existentes de `src/lib/auth` e módulos, a suíte completa e a checagem de tipos; informar números e quaisquer falhas, sem atribuir falhas a este trabalho sem verificar.
- Conferir no navegador celular e desktop, claro/escuro: formulário, seletor, olho, Enter, área Google, erros, teclado/rolagem e ausência do ilustrativo. Não testar copy/estilo com snapshots unitários.
- Conferir entrada real com senha e acesso autorizado ao módulo, preservando sessão; testar Google admin permitido e técnico bloqueado quando houver contas/sessões de teste disponíveis. Informar explicitamente qualquer verificação não realizada.
- Roteiro Android (Chrome e app instalado): preenchimento automático, entrada normal, envio com rede lenta/modo avião (erro em aproximadamente 15 s), Limpar após 10 s, sessão antiga/inválida e saída somente no aparelho atual.
- Conferir diff e erros da prévia; **não publicar**.

## Riscos
- Remover Google da apresentação inicial torna seu acesso menos óbvio para admins: o link secundário e o favorito `admin=1` resolvem sem alterar segurança.
- Em aparelho compartilhado, a operação lembrada pode ser de outra pessoa; permanece visível e editável, com a checagem de acesso intacta.
- CSS compartilhado pode afetar outras telas se alterado amplamente: limitar mudanças aos estilos do login e manter componentes globais intactos.
- Preenchimento automático e teclado variam entre Chrome/app instalado; a conferência em aparelho real continua necessária. Mais leve visualmente não implica login de rede mais rápido; não prometer redução dos tempos de autenticação.

## Perguntas em aberto
Nenhuma bloqueante. A aprovação aceita estes padrões propostos: “Acesso administrador” disponível de forma discreta para todos, Google somente após abertura explícita (ou `admin=1`), sem lembrar papel no aparelho; ilustrativo removido também no desktop; operação sem preferência inicial permanece exigindo seleção como hoje.
