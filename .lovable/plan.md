# Etapa 3 do Nova OS: mais limpa e com técnico obrigatório

## O que muda na tela

- Remover os textos: "Quem pediu e quem vai executar?", "Registre o solicitante e defina como a execução será atribuída.", "Pessoa responsável pela abertura desta OS no cliente.", "Execução da OS" e "Se a equipe ainda não estiver definida, registre essa decisão explicitamente."
- Remover o cartão "Sem técnico definido" e a possibilidade de avançar sem técnico: a etapa passa a exigir ao menos um técnico selecionado.
- Cabeçalho da etapa fica apenas com o rótulo "Etapa 3 · Solicitante e técnico".
- Ordem enxuta: campo "Solicitante da OS" → alternador "Selecionar existente / Cadastrar novo" → busca → lista de técnicos, com os selecionados em destaque acima da lista (chips removíveis, como hoje).

## Layout e interação

- Desktop: lista de técnicos em duas colunas, com altura de rolagem controlada, para que muitos técnicos não empurrem o botão "Continuar" para fora da tela.
- Mobile: coluna única, linhas com toque confortável e nomes que quebram sem estourar a largura.
- Busca no topo da lista, contador de resultados discreto junto ao título da lista.
- Mensagem de erro clara quando nenhum técnico está marcado: "Selecione ao menos um técnico para continuar."

## Detalhes técnicos

- `src/components/ordens/ServiceOrderWizard.tsx`: remover o bloco `noTech` do `TechnicianStep`, os textos citados, e reorganizar o layout (grid responsivo `sm:grid-cols-2` na lista, `min-w-0`/`truncate` nos textos).
- `src/lib/serviceOrders/wizard.ts`: remover `noTech` do draft e ajustar a validação da etapa 3 para exigir `techIds.length > 0`.
- Ajustar os demais usos de `noTech` no wizard (draft inicial, envio de `technician_ids`, resumo da revisão) e atualizar `src/lib/serviceOrders/wizard.test.ts`.
- Sem mudanças de banco: OS já existentes sem técnico continuam funcionando; a exigência vale apenas na criação.