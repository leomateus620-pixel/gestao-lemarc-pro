## Objetivo

Refazer a geração do PDF "Relatório Gerencial de Ordens de Serviço" com identidade Lemarc: cabeçalho institucional com logo, dados da empresa, acentuação correta, tabelas com hierarquia, rodapé em todas as páginas e apresentação elegante para OS ainda não finalizadas.

Mantém os dados reais já consumidos hoje (mesmas queries de `useReports` → `buildManagerialReport`). Nenhuma mudança em queries, schema ou cálculos financeiros.

## Arquivos afetados

- `src/lib/reports/managerialDownload.ts` — refatorar a função `downloadManagerialReportPdf` (jsPDF) com novo layout, header/footer recorrentes e helpers de formatação.
- `src/lib/reports/lemarcBrand.ts` *(novo)* — constantes da empresa (razão social, endereço, telefone, e-mail, CNPJ), paleta de cores Lemarc (laranja `#EA580C`, azul `#0B2545`) e helper para carregar a logo como dataURL.
- `src/lib/reports/labels.ts` *(novo)* — normalização de rótulos fixos do relatório em PT-BR acentuado (status, KPIs, colunas, mensagens de "Aguardando apuração", "Em execução", "OS em aberto" etc.). Exporta também helpers `formatTempo(row)`, `formatValor(row)`, `formatFechamento(row)` para a regra dos OS não finalizados.
- `src/assets/lemarc-logo.png` *(novo)* — logo oficial enviada pelo usuário, embutida no PDF via dataURL. Se o usuário não anexar a logo na próxima mensagem, uso um cabeçalho tipográfico de fallback (texto "GESTÃO LEMARC" em laranja/azul) até a logo chegar.
- `src/components/reports/print/ManagerialReportDocument.tsx` — espelhar o novo layout (cabeçalho institucional, badges de status, mensagens de pendência) na pré-visualização HTML para manter coerência com o PDF.

## Novo layout do PDF (jsPDF, A4, margens 14mm)

### Cabeçalho institucional (página 1, repetido reduzido nas demais)
```text
┌──────────────────────────────────────────────────────────────┐
│ [LOGO]   LEMARC INST. E MANUT. ELÉTRICA LTDA.    Gerado em   │
│          Rua Arnaldo Gassen, 70 — Glória         26/06/2026  │
│          Santa Rosa-RS · CNPJ 19.056.094/0001-49 10:48       │
│          Fone: 55-99991 5017 · lemarc@lemarc.ind.br Por: Leo │
├──────────────────────────────────────────────────────────────┤
│ RELATÓRIO GERENCIAL DE ORDENS DE SERVIÇO                     │
│ Período: Hoje (26/06/2026)                          [badge]  │
└──────────────────────────────────────────────────────────────┘
```
Linha laranja fina de 0,8mm separando o bloco institucional do título. Páginas seguintes recebem versão compacta (logo pequena + razão social + CNPJ + título do relatório).

### Rodapé (todas as páginas)
```text
LEMARC INST. E MANUT. ELÉTRICA LTDA. · CNPJ 19.056.094/0001-49 · 55-99991 5017
Gerado em 26/06/2026 10:48                                Página X de Y
```
Implementado num passe final iterando `doc.getNumberOfPages()` para preencher "X de Y".

### Seções
1. **Resumo executivo** — 12 KPIs em grade 4×3, com label cinza pequeno + valor azul forte. Quando o valor estiver indisponível (ex.: `estimatedValue === 0` e há OS sem fechamento), mostra "Aguardando apuração" em cinza médio em vez de R$ 0,00.
2. **Análise por status** — tabela com Status, Qtd, % + mini-barra horizontal preenchida (retângulo cinza claro + barra azul/laranja proporcional ao percentual).
3. **Top clientes** — tabela com zebra striping; coluna Valor mostra "Aguardando apuração" quando 0.
4. **Produtividade por técnico** — idem; coluna Horas mostra "Aguardando fechamento" quando 0 e a OS associada ainda está aberta, ou "0h registradas" quando realmente houve apontamento zero.
5. **Tipos de serviço** — chips em duas colunas.
6. **Observações das OS** — cards com borda fina, número/título em destaque, badge de status colorido (em execução=azul, concluída=verde, pendente=âmbar, revisão=roxo, aguardando cobrança=laranja), linha de apuração com "Aguardando finalização da OS" quando aplicável.
7. **Lista detalhada de OS** — tabela com quebra de página inteligente (reimprime header), colunas: Nº, Título, Cliente, Técnico(s), Status (badge), Abertura, Fechamento, Tempo, Valor. Regras de não-finalizada já descritas.
8. **Pontos de atenção cadastral** — bloco visual: cada contagem em card com quantidade grande + orientação curta (ex.: "Cadastrar valor/hora na finalização da OS para permitir apuração financeira").

### Tratamento de OS não finalizadas
Helper central em `labels.ts`:
- `formatFechamento(row)` → "Em aberto" se `closed_at` for null.
- `formatTempo(row)` → `formatHours` se `worked_minutes_effective > 0`, senão "Aguardando fechamento".
- `formatValor(row)` → `formatCurrency` se `estimated_value > 0`, senão "Aguardando apuração" (ou "Valor/hora pendente" se `hour_rate` for null).
- Resumo executivo: "Valor estimado" passa a exibir `formatCurrency(summary.estimatedValue)` apenas quando > 0; senão "Aguardando apuração". "Tempo médio" idem.

### Acentuação
Todos os textos fixos passam por uma tabela `LABELS` em `labels.ts` já com acentuação correta. Removo o `cleanPdfText` que normalizava NFD/diacríticos — Helvetica (latin-1) do jsPDF já suporta os caracteres acentuados PT-BR. Mantenho apenas a remoção de caracteres de controle.

## Logo

- Carrego `src/assets/lemarc-logo.png` em build via `import logoUrl from "@/assets/lemarc-logo.png"` e converto para dataURL no client com `fetch(logoUrl).then(r => r.blob()).then(toDataUrl)` antes do `doc.addImage`.
- Dimensiono preservando aspect ratio com largura fixa de ~32mm (página 1) e ~16mm (páginas seguintes).
- Aguardo o arquivo da logo nesta thread (formato PNG/SVG transparente, mínimo 600px no lado maior). Se chegar SVG, converto para PNG via canvas off-screen antes de embutir.
- Fallback até a logo chegar: bloco tipográfico "GESTÃO **LEMARC**" em fonte bold com retângulo de marca laranja, sem distorcer.

## Validação

1. `bun run build` e `bun run lint`.
2. `bunx vitest run` para confirmar que `finance.test.ts` permanece verde.
3. Geração manual do PDF em Playwright (chromium headless) baixando o arquivo, convertendo páginas para imagem com `pdftoppm` e inspecionando: logo nítida, dados Lemarc presentes, acentuação correta, OS não finalizadas mostrando "Em aberto"/"Aguardando apuração", rodapé "Página X de Y" em todas as páginas, nenhuma sobreposição.
4. Conferência da pré-visualização HTML em `/relatorios/imprimir` em desktop e mobile.

## O que NÃO muda

- Queries, server functions, schema do banco, cálculos do `buildManagerialReport`, filtros, rota `/relatorios/imprimir`, fluxo de download a partir do `ReportGenerateDialog`. Apenas a camada de apresentação do PDF/HTML é refeita.
