## Ajuste

Na Etapa 2 do wizard de nova OS (`ClientStep` em `src/components/ordens/ServiceOrderWizard.tsx`), cada cartão de cliente hoje mostra apenas nome + unidade. Vou incluir o CNPJ.

## Mudanças

Arquivo: `src/components/ordens/ServiceOrderWizard.tsx`

1. Ampliar o tipo da prop `clients` em `ClientStep` e `ReviewStep` para incluir `cnpj: string | null` (o hook `useClientsFullQuery` já retorna esse campo, então não precisa tocar em API).
2. No cartão de cliente (dentro do `filtered.map`), abaixo do nome/unidade, renderizar uma linha `CNPJ 00.000.000/0000-00` usando `maskCNPJ(c.cnpj)` — só quando existir. Estilo discreto (mono, `text-slate-400`, `text-[10px]`), consistente com a linha de CNPJ já usada nos cards de unidade logo abaixo.
3. Incluir o CNPJ (mascarado e apenas dígitos) no filtro de busca, para permitir buscar cliente também por CNPJ.

Nenhuma outra tela, tipo global ou rota é alterada. Sem mudanças de backend.

## Validação

- Abrir `/ordens/nova` → Etapa 2 → cada cliente com CNPJ cadastrado exibe o CNPJ formatado abaixo da unidade.
- Digitar dígitos do CNPJ na busca → cliente aparece filtrado.
- Clientes sem CNPJ continuam funcionando (linha some).
