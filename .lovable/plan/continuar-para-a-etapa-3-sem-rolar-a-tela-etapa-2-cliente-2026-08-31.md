# Continuar para a Etapa 3 sem rolar a tela (Etapa 2 · Cliente)

## Situação atual

Na Etapa 2 o botão "Continuar" só existe no rodapé do assistente, abaixo da lista de clientes e da lista de unidades. Com 6 clientes e várias unidades, o admin precisa rolar toda a tela até o fim para avançar, mesmo já tendo escolhido empresa e unidade.

## O que será feito

1. **Botão "Continuar" ao lado do cliente selecionado**
   - O cartão verde "Cliente selecionado" (que aparece assim que a empresa é escolhida) ganha um botão "Continuar" à direita, no mesmo bloco.
   - Ele fica no topo da etapa, sempre visível logo após a seleção — sem rolagem.
   - Ao clicar, avança exatamente pelo mesmo caminho do botão do rodapé (mesmas validações). Se algo obrigatório faltar, o aviso de revisão aparece igual hoje.

2. **Cartão de seleção fixo no topo enquanto a lista rola**
   - O bloco "Cliente selecionado" passa a acompanhar a rolagem (fixo no topo da etapa) no desktop, então o botão continua ao alcance mesmo depois de descer até as unidades.
   - No mobile o comportamento é o mesmo, com o cartão compacto para não ocupar espaço demais.

3. **Resumo da unidade no mesmo cartão**
   - Quando a unidade é escolhida, o cartão passa a mostrar "Empresa · Unidade", deixando claro o que será enviado à Etapa 3 antes de clicar em Continuar.

4. **Rodapé mantido**
   - O botão "Continuar" do rodapé continua existindo, para quem já está acostumado com ele. Nada do fluxo atual é removido.

## Detalhes técnicos

- `src/components/ordens/ServiceOrderWizard.tsx`: `ClientStep` passa a receber `onContinue` e `canContinue` (reaproveitando `goNext` e `validity[1]` já existentes no componente pai) e renderiza o botão dentro do bloco `lemarc-selected-summary`, com layout `flex` responsivo (empilhado no mobile, lado a lado no desktop).
- O cartão de seleção recebe `sticky top-…` com `z-index` acima da lista, respeitando `--lemarc-header-content-offset` já usado no wizard.
- Nenhuma alteração de regra de negócio, validação ou backend: apenas apresentação e um atalho para a ação já existente.
