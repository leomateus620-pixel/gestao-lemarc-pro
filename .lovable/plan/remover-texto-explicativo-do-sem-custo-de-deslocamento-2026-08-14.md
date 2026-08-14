# Remover texto explicativo do "Sem custo de deslocamento"

## O que muda
Na etapa de apuração de horas e valores (revisão da OS), quando o admin escolhe "Sem deslocamento", o bloco deixa de exibir o parágrafo explicativo ("A OS seguirá para revisão apenas com mão de obra e materiais disponíveis. Pode finalizar assim: ...").

Fica apenas o rótulo curto "Sem custo de deslocamento" com o ícone, mantendo o visual limpo.

## Detalhes técnicos
- Arquivo: `src/components/ordens/FinalizeServiceOrderDialog.tsx`
- Remover o `<p>` de texto auxiliar dentro do bloco `displacement.type === "none"` (linhas ~1035-1039), preservando o título e o comportamento.
- Nenhuma alteração de lógica, cálculo ou persistência: a decisão de "sem deslocamento" continua registrada e o preenchimento automático de km segue desativado nesse caso.
