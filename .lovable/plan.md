# Blindagem do login de técnicos

Mantém tudo que existe: tempos limite (15 s / 8 s, "Limpar" após 10 s), saída só neste aparelho, regra dos 30 dias, `isGoogleSession` + bloqueio de Google para técnicos, e o novo layout do login.

## Ordem de entrega (urgência primeiro)

1. **Entrega A — hoje (só tela, sem banco):** itens 1, 2, 3 + checagem de versão (item 4). Resolve o caso do Vinícius e o layout antigo.
2. **Entrega B:** redefinir senha pelo admin dentro do app (item 5), com auditoria.
3. **Entrega C:** diagnóstico de tentativas (item 6).
4. **Entrega D:** testes e2e (item 7). Os testes unitários acompanham cada entrega.

## 1. Campos
- Senha: `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`, `autoComplete="current-password"`, mantidos também quando visível (type=text).
- E-mail: mesmos atributos; antes de enviar, `trim()` + `toLowerCase()`.
- A senha nunca é alterada. Se tiver espaço no início/fim: aviso abaixo do campo ("Sua senha tem espaço no início ou no fim") enquanto digita, e repetido se o login falhar.

## 2. Dicas
- Caps Lock: `getModifierState("CapsLock")` em keydown/keyup na senha → "Caps Lock está ativado".
- Se o login falhar com credenciais inválidas e a senha começar com maiúscula → "Confira se a primeira letra não ficou maiúscula".

## 3. Mensagens de erro distintas
Uma função pura `describeLoginError(err, context)` que mapeia para:
- Credenciais inválidas → "E-mail ou senha inválidos." (mesma mensagem exista ou não o e-mail)
- Tempo esgotado / sem rede (`navigator.onLine === false`) → "Sem conexão…" / mensagem atual de tempo esgotado
- E-mail não confirmado → atual
- Conta bloqueada (`user_banned`) → "Esta conta está bloqueada. Fale com o administrador."
- Muitas tentativas (HTTP 429 / `over_request_rate_limit`) → "Muitas tentativas. Aguarde alguns minutos."
- Google restrito a admins → atual
- Sem acesso ao módulo → atual
Usa `error.code`/`status` quando disponível, texto como reserva.

## 4. Checagem de versão
- No build, gerar `public/version.json` com `{ buildId }` e embutir o mesmo `buildId` no app (`import.meta.env.VITE_BUILD_ID`), via plugin no `vite.config.ts`.
- O app compara ao abrir, ao voltar o foco/visibilidade, a cada 5 min e no `pageshow` com `persisted` (bfcache do Safari). Busca com `cache: "no-store"` e `?t=`.
- Versão nova: no `/login` recarrega na hora; nas demais telas só recarrega se não houver formulário em edição/revisão/assinatura (reaproveita a mesma proteção do auto-reload do Android); senão adia até a próxima checagem.
- Falha de rede na checagem nunca recarrega nem mexe na sessão.
- Cabeçalhos: conferir no site publicado que o HTML vem `no-cache` e `version.json` `no-store`; se a hospedagem não permitir definir o cabeçalho do arquivo estático, servir `/version.json` por uma rota de servidor com `Cache-Control: no-store` (fallback garantido).

## 5. Redefinir senha pelo admin (ficha do colaborador)
- Botão "Redefinir senha" na ficha do colaborador, visível só para admins e só se o técnico tiver login.
- Diálogo: "Gerar senha forte" (12+ caracteres, sem caracteres confusos, minúsculas no início) ou digitar; mostrar/copiar uma única vez; confirmação "Redefinir a senha de Fulano?".
- Função de servidor `adminResetTechnicianPassword`: exige login, confere papel admin via `has_role` no servidor; só então carrega o cliente privilegiado e chama `auth.admin.updateUserById(id, { password })`. Recusa alvo que seja admin (evita escalada) e o próprio usuário.
- Senha nunca gravada em tabela nem em log; payload nunca logado.
- Auditoria: grava (quem, quando, para quem, ação) sem a senha.
- Opcionais (recomendo adiar): "Encerrar sessões do técnico" (desconecta todos os aparelhos dele — aceitável, é ação explícita do admin) e "Desvincular Google" (risco: irreversível sem novo vínculo e pouco ganho, já que o bloqueio de Google para técnicos já funciona pelo método da sessão). Sugestão: só o encerrar sessões.

## 6. Diagnóstico de tentativas
- Sem tabela não dá para o admin ver tentativas de outros aparelhos (os registros atuais ficam só no console do aparelho). Logs de autenticação do servidor existem, mas não trazem versão do app nem a etapa no aparelho. Então: uma tabela nova, aditiva.
- Campos: etapa, código de erro, duração, online/offline, versão do app, navegador resumido (ex.: "iOS Safari 17"), e-mail mascarado (`lv***@gmail.com`), data. Nunca senha, token ou e-mail completo.
- Tela para admins em Configurações → "Diagnóstico de login", com filtro por e-mail mascarado e período.

## 7. Testes
- Unitários: normalização de e-mail, detecção de espaço/maiúscula, `describeLoginError` (cada caso), comparação de versão + regra "recarregar só se seguro", gerador de senha, máscara de e-mail.
- E2E Playwright contra o preview, com respostas de login simuladas (sem senhas reais no repositório): login com senha; senha errada + dica de maiúscula; técnico via Google bloqueado; admin via Google permitido; tempo esgotado/offline mantém sessão; regra dos 30 dias; nova versão força recarga no /login; redefinição de senha pelo admin (função simulada + checagem de recusa para não-admin).
- Antes de cada entrega: suíte completa e tipos.

## Mudanças de banco (só aditivas)
- `login_diagnostics` (Entrega C): insert permitido para visitante e logado, com limites de tamanho por coluna (trigger de validação) e limite de taxa simples (trigger que recusa mais de N inserts por e-mail mascarado/minuto); SELECT só admin; sem UPDATE/DELETE para clientes; limpeza diária de registros com mais de 30 dias (agendamento no banco).
- `admin_password_resets` (Entrega B): ator, alvo, data, ação; insert só pelo servidor; SELECT só admin. Nada de senha.
- Nenhuma alteração em tabelas, papéis ou dados existentes.

## Riscos
- Recarga automática no meio de algo: mitigado pela proteção de formulário em edição; no /login não há o que perder (o e-mail digitado pode ser perdido — aceitável).
- Insert anônimo de diagnóstico pode ser abusado: limites de tamanho/taxa e retenção de 30 dias.
- Redefinir senha não desconecta automaticamente os outros aparelhos do técnico (sessões existentes continuam até expirar), a menos que se use "Encerrar sessões".
- Aba antiga já aberta só pega a checagem de versão depois que ela própria estiver atualizada; a primeira atualização ainda depende de o usuário fechar/reabrir uma vez.

## Perguntas em aberto
1. Incluir "Encerrar sessões do técnico" já na Entrega B? E "Desvincular Google": deixar fora?
2. Admin pode redefinir senha de outro admin? (Plano: não.)
3. Diagnóstico: registrar também logins bem-sucedidos ou só falhas?
4. Intervalo de checagem de versão de 5 min está bom?

## Detalhes técnicos
- Arquivos: `src/routes/login.tsx`, novo `src/lib/auth/loginInput.ts` (+test), novo `src/lib/auth/loginErrors.ts` (+test), novo `src/lib/app/versionCheck.ts` (+test) montado em `src/routes/__root.tsx`, `vite.config.ts` (buildId + version.json), possível `src/routes/version[.]json.ts`, novo `src/lib/api/adminUsers.functions.ts`, novo `src/components/colaboradores/ResetPasswordDialog.tsx` em `src/routes/_app.colaboradores.$id.index.tsx`, novo `src/lib/api/loginDiagnostics.functions.ts` + tela em configurações, `tests/e2e/*.spec.ts`, `AGENTS.md` (regras de versão e de redefinição de senha).
- Sem alterações em `AuthContext.tsx`, `sessionPolicy.ts`, `withTimeout.ts` além de, eventualmente, ler a versão do app para os diagnósticos.
