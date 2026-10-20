# Relatório de uso do banco (só leitura — sem implementação)

Data: 20/10/2026. Nada foi alterado.

## 1) Tamanho e limites
- Banco: 82,6 MB; disco de dados em 18% de uso. Fonte: `db_health` e `pg_database_size`.
- Log de transações (WAL): 96 MB (normal, é reciclado). Fonte: `db_health`.
- Limites do plano: não consultei a cobrança. O disco está com folga de cerca de 80%. O limite exato aparece em Backend → Advanced settings.

## 2) Maiores tabelas (tamanho total com índices; linhas estimadas)
Fonte: `pg_total_relation_size` / `reltuples` (estimativa do Postgres).
| Tabela | Total | Linhas |
|---|---|---|
| service_order_signatures | 11 MB | 176 |
| notification_delivery_log | 632 kB | 718 |
| service_order_notifications | 536 kB | 326 |
| service_order_time_sessions | 416 kB | 660 |
| service_order_labor_entries | 312 kB | 673 |
| service_orders | 264 kB | 191 |
| service_order_technicians | 216 kB | 336 |
As tabelas de Leitos Aramados são quase vazias (menos de 100 kB).
As assinaturas pesam cerca de 65 kB por linha porque a imagem fica gravada no campo `signature_data_url`.

## 3) Arquivos (storage)
Fonte: `storage.objects`, campo metadata.size.
| Bucket | Arquivos | Tamanho |
|---|---|---|
| service-order-attachments (fotos) | 272 | 77 MB |
| service-order-materials (PDFs) | 63 | 13 MB |
| service-order-signatures | 250 | 10 MB |
Total de cerca de 100 MB.

## 4) Crescimento por mês (contagem de created_at)
| Mês | OS | Sessões de tempo | Fotos | Log de push |
|---|---|---|---|---|
| 07/2026 | 19 | 41 | 29 | – |
| 08 | 59 | 210 | 86 | – |
| 09 | 62 | 253 | 81 | 305 |
| 10 (até dia 20) | 53 | 173 | 59 | 450 |
O ritmo está estável em cerca de 60 OS por mês. O log de push é o item que mais cresce. A estimativa é de 1 a 2 MB de banco e de 25 a 30 MB de arquivos por mês, ou seja, anos de folga.

## 5) Conexões e desempenho
- Conexões: 12 de 60; pool 1 de 200; memória em 61%; nenhum alerta em 48 h. Fonte: `db_health`.
- Consulta mais lenta: a lista de OS. Foram 3.108 chamadas, com média de 388 ms e pico de 4,1 s. Fonte: `slow_queries`. Ela carrega junto o `signature_data_url` (a imagem da assinatura) de cada OS. A causa provável é esse volume de dados, não a falta de índice. Isso ainda não foi confirmado com EXPLAIN.
- 1.025 transações desfeitas desde o último reinício. É baixo e esperado, porque as RPCs recusam operações inválidas.
- Não fiz a varredura de índices faltando.

## 6) Riscos e recomendações (só sugestões)
1. Tirar a imagem da assinatura da consulta da lista de OS. É o maior ganho de velocidade, principalmente no celular.
2. A longo prazo, guardar as assinaturas só como arquivo, sem a cópia dentro do banco.
3. Definir quanto tempo guardar o log de push (por exemplo, 90 dias).
4. Fotos: comprimir no envio, se ainda não for feito. É o que mais ocupa espaço.
5. Não há necessidade de aumentar o servidor nem o disco agora.
