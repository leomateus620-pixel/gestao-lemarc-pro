# Novo pedido — tela única, mais limpa e melhor tipografia

Refaz a tela `Novo pedido` do módulo Leitos Aramados: sai o wizard de 4 etapas, entra uma única tela com seções sequenciais no scroll, hierarquia tipográfica destacada e revisão enxuta no final.

## Estrutura da nova tela

```text
Novo pedido  (cabeçalho com voltar)
 ├─ 01 · Cliente        Cliente, Unidade, Prioridade
 ├─ 02 · Itens          lista de produtos + quantidade + valor unitário
 ├─ 03 · Entrega        data prevista (experiência aprimorada) + observações
 └─ 04 · Revisão        resumo enxuto dos dados + disponibilidade
Barra de ações final: Salvar rascunho | Confirmar pedido
```

Cada seção tem um número grande, título em display bold e uma linha de apoio curta; os separadores organizam o scroll sem caixas dentro de caixas.

## Mudanças pedidas

- Cliente: removidos os campos "Referência do pedido do cliente" e "Referência da cotação" (continuam enviados como nulos ao backend, sem mudança de schema).
- Itens: corrigido o campo "Valor unitário" — hoje ele fica preso em `0` porque o valor é derivado dos centavos a cada tecla. Passa a manter o texto digitado (permitindo campo vazio) e converter para centavos apenas no envio. Mesmo tratamento para "Quantidade".
- Entrega: data prevista com destaque tipográfico — rótulo forte, campo maior, exibição legível da data escolhida em português ("quinta, 6 de agosto de 2026"), atalhos rápidos (hoje, +7 dias, +15 dias) e aviso quando a data é passada. Removido o card azul "Planejamento autoritativo".
- Revisão: removidos os cards "Salvar rascunho" e "Confirmar agora". Fica um resumo objetivo: cliente/unidade, prioridade, data de entrega, observações, lista de itens com quantidade e valor, total e a disponibilidade indicativa por produto.
- Validações continuam as mesmas (cliente obrigatório, ao menos um item com quantidade válida); os erros aparecem junto da seção correspondente e a tela rola até ela.
- A prévia de disponibilidade passa a ser carregada sob demanda quando os itens estão válidos, já que não existe mais o passo que a disparava.

## Detalhes técnicos

- Arquivo único afetado: `src/components/leitos/pages/OrdersPage.tsx` (componente `WireTrayOrderWizardPage`); imports não usados (`ShieldCheck`, `ClipboardList`, `Factory`) são removidos.
- Estado `step`/`wire-stepper` eliminado; itens, formulário e mutações de salvar/confirmar/prévia permanecem os mesmos.
- Estilos com as classes `wire-*` existentes mais utilitários Tailwind; sem novos tokens de cor nem alterações em `src/styles.css`.
- Nenhuma mudança de banco de dados, server function ou regra de negócio.
