Plano para corrigir o relatório gerencial de hoje:

1. Corrigir a tela em branco
- Ajustar a rota `/relatorios/imprimir` para não depender do fluxo visual atual que apenas chama `window.print()`.
- Adicionar limites de erro e estado vazio visível na rota de impressão, para nunca abrir uma página totalmente em branco.
- Garantir que a página só tente gerar/baixar depois que autenticação e dados estiverem prontos.

2. Entregar download real do relatório
- Substituir o comportamento de “abrir página e imprimir” do botão “Gerar PDF” por geração/download direto de um arquivo HTML imprimível do relatório gerencial.
- O arquivo baixado terá o conteúdo completo do relatório no padrão Lemarc, com resumo, indicadores, status, clientes, técnicos, tipos de serviço, observações e lista detalhada de OS.
- Nomear o arquivo de forma objetiva, por exemplo `relatorio-gerencial-lemarc-hoje-AAAA-MM-DD.html`.

3. Manter opção de visualização/impressão
- Manter a rota `/relatorios/imprimir` como pré-visualização alternativa, mas com UI de carregamento/erro e botão manual de imprimir/salvar.
- Remover o auto-print imediato que hoje pode causar sensação de falha quando o navegador bloqueia ou cancela o diálogo.

4. Filtro “OS do dia”
- Validar o botão “Hoje” no modal e no relatório principal usando o filtro `period=today`.
- Garantir que o filtro de data busque OS abertas entre 00:00 e 23:59:59 do dia atual, sem quebrar os outros filtros.

5. Validação
- Testar no navegador o fluxo: Relatórios → Gerar relatório gerencial → Hoje → Gerar PDF.
- Confirmar que o download é disparado e que a prévia não fica em branco.
- Revisar desktop e mobile nos pontos afetados.
- Rodar checagens relevantes de build/lint/testes após a implementação.