# Materiais no PDF final da OS: somar todos os orçamentos anexados

## Causa raiz (confirmada no código)

O valor de materiais no relatório **não vem do banco** — ele é extraído do PDF anexado no momento em que o relatório é gerado, e essa extração olha **somente o primeiro anexo**:

1. `src/lib/reports/serviceOrderDownload.ts` — na função de download, após listar os anexos, o código faz `const first = matEntries[0]` e extrai o "Total Líquido" apenas desse arquivo. Todos os anexos são **mesclados** ao PDF (por isso os 2 orçamentos aparecem como páginas), mas apenas o primeiro entra no valor.
2. `src/routes/_app.ordens.$id.imprimir.tsx` — a pré-visualização faz `materials.find((m) => m.signed_url)`, ou seja, também só o primeiro.
3. `src/components/reports/print/ServiceOrderReportDocument.tsx` — recebe um único `materialsNetCents` + um único `materialsFileName`.
4. `service_order_financials.materials_total_cents` é gravado como **0**: `FinalizeServiceOrderDialog.tsx` envia `materials_total_cents: 0` na finalização, e `finalizeServiceOrder` grava esse zero e soma zero no `grand_total_cents`. Por isso as OS #1124 e #1129 têm materiais = 0 e total geral sem materiais.

Ou seja: com 2 orçamentos, o card "Total dos materiais" mostra o valor de um só; e o total gravado na apuração ignora materiais completamente.

## Correção proposta

Desenho: **os anexos de orçamento são a fonte da verdade**; o total de materiais é a **soma do "Total Líquido" de todos os PDFs anexados**, persistido na apuração para que relatórios gerenciais e o total geral fiquem consistentes.

### 1. Extração de todos os anexos (soma)
- `materialsTotalExtractor.ts`: manter a extração por arquivo; adicionar um helper que recebe uma lista de PDFs e devolve `{ totalCents, items: [{ fileName, cents, reason }], failedCount }`.
- `serviceOrderDownload.ts`: iterar todos os `matEntries` (buscando os bytes uma única vez e reaproveitando-os na mesclagem, como já é feito com o primeiro), somar os valores e alimentar o documento com a lista.
- `_app.ordens.$id.imprimir.tsx`: mesma mudança na pré-visualização, para preview e download mostrarem o mesmo número.

### 2. Exibição (mudança mínima, sem redesenho)
- `ServiceOrderReportDocument.tsx` e o gerador jsPDF passam a aceitar `materialsItems` (arquivo + valor) além do total.
- O card existente "Total dos materiais" vira: uma linha por orçamento (nome do arquivo + valor) e a linha de soma. Com 1 anexo o visual fica idêntico ao atual.
- Se algum arquivo falhar na leitura, ele aparece com "—" e o aviso atual de extração é mantido; a soma dos que foram lidos continua sendo exibida.

### 3. Persistência na apuração
- Na finalização (`FinalizeServiceOrderDialog.tsx`), extrair o total dos anexos e enviar o valor real em vez de `0`; mostrar o valor somado (somente leitura, com opção de ajuste manual caso a extração falhe).
- Nova server function `recalcOrderMaterialsTotal` (em `financials.functions.ts`, admin-only) que recebe `{ orderId, materials_total_cents }`, grava `materials_total_cents` e recalcula `grand_total_cents = labor + deslocamento + materiais`, **sem tocar** em horas, deslocamento, status, assinatura ou apontamentos.
- Chamar essa função ao **anexar** e ao **remover** um PDF de materiais (`ServiceOrderMaterialsSection.tsx`), inclusive em OS já aprovada — o recálculo altera apenas a linha de materiais/total.
- Garantir que os outros pontos que recalculam totais (`financials.functions.ts` linhas ~294, ~657) continuem preservando `materials_total_cents`, como já fazem.

### 4. Dados das OS #1124 e #1129
Após o código entrar, para cada OS: ler os 2 orçamentos, somar os "Total Líquido", gravar em `materials_total_cents` e recalcular `grand_total_cents` (labor 162.887 + desloc. 62.000 + materiais para a #1124; 410.540 + 120.000 + materiais para a #1129). Se algum PDF não tiver camada de texto, informo os valores extraídos e peço confirmação do valor manual antes de gravar.

## Validação
- Testes unitários: soma de 0, 1 e 2+ arquivos; um arquivo sem "Total Líquido" (soma parcial + aviso); arquivo não-PDF ignorado.
- Teste do documento de relatório: com 2 anexos o total geral = labor + deslocamento + soma dos dois orçamentos.
- Manual: gerar PDF das #1124 e #1129 e conferir card de materiais, total geral e as páginas anexadas.

## Checklist de regressão
- [ ] OS sem anexo: relatório idêntico ao atual (sem card de materiais).
- [ ] OS com 1 anexo: valor e layout inalterados.
- [ ] Mesclagem dos anexos a partir da página 2 continua funcionando.
- [ ] Horas, apontamentos e deslocamento inalterados após recálculo de materiais.
- [ ] Assinatura, finalização e aprovação sem alteração de fluxo.
- [ ] Técnico continua sem ver anexos de materiais (rota admin-only preservada).
- [ ] Relatórios gerenciais refletem o novo total geral.

## Riscos
- PDFs escaneados (sem texto) não permitem extração automática — tratados com "—" e ajuste manual.
- Ler vários PDFs deixa a geração um pouco mais lenta; mitigado reaproveitando os bytes já baixados para a mesclagem.
