# Excluir 3 empresas duplicadas do menu Clientes

## O que será feito

Remover apenas estes 3 registros de empresa (cadastro raiz), que foram criados por engano com nomes que já existem como unidades da CAMERA AGROINDUSTRIAL S.A:

- Camera cruzeiro
- Camera Novo Machado
- Camera Tuparendi

## Verificação já feita

Os três registros estão vazios: 0 unidades e 0 ordens de serviço vinculadas. A exclusão não afeta nenhum histórico.

A CAMERA AGROINDUSTRIAL S.A (63 unidades, 32 OS) e todas as suas unidades com esses mesmos nomes permanecem intactas.

## Detalhes técnicos

Exclusão dos 3 registros da tabela `clients` pelos IDs confirmados. Nenhuma alteração de código, de estrutura de banco ou de regras de acesso.
