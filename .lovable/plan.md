# Ajustes visuais da Equipe técnica da OS

Só visual. Sem mudança de lógica, dados, permissões ou textos.

## 1. Botões desabilitados no "Adicionar técnico"

Arquivo: `src/components/ordens/AddOrderTechniciansDialog.tsx` (rodapé do diálogo, botões "Vincular técnico" e "Vincular e iniciar agora").

Hoje o botão base já tem `disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none`, mas com o laranja forte do tema escuro 50% de opacidade ainda parece ativo. Além disso, `pointer-events-none` impede o cursor not-allowed de aparecer.

Acrescentar nos dois botões (sem tocar no `button.tsx` global):

```text
disabled:pointer-events-auto disabled:cursor-not-allowed
disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground
disabled:border disabled:border-border disabled:shadow-none
```

Resultado: desabilitado = cinza neutro (tokens `muted` / `muted-foreground` / `border`), sem laranja, cursor de bloqueado. Habilitado não muda (secondary e primary laranja). Durante o envio (`isPending`) usa o mesmo estado, mantendo o spinner visível.

## 2. Fundo do cartão "Equipe técnica da OS"

Arquivo: `src/styles.css` (o cartão já tem a classe `lemarc-os-team-card`, sem regra própria; hoje herda o gradiente translúcido do `glass-card`, que fica mais claro que os vizinhos).

Nova regra, espelhando `.lemarc-os-time-control.glass-card`:

```text
.lemarc-os-team-card.glass-card
  border-radius: 1rem
  border-color: oklch(1 0 0 / 0.14)       (mesma borda do resumo da OS)
  background: oklch(0.14 0.036 252 / 0.98) (mesmo fundo do resumo e do controle de tempo)
  color: oklch(0.985 0.005 250)
  backdrop-filter: none
  box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 18px 40px -32px oklch(0 0 0 / 0.9)
```

Ajustes de contraste em `src/components/ordens/OrderTeamCard.tsx` (só classes):
- Linhas de técnico de outros: `border-white/10 bg-white/[0.04]` → `border-white/12 bg-white/[0.03]` para não clarear sobre o fundo novo.
- Textos secundários (função, horas, "Vinculado em", rodapé): `text-muted-foreground/80` → `text-muted-foreground`; o rodapé `text-[10px]` passa a `text-[11px]` para leitura no celular.
- Linha própria (`border-primary/40 bg-primary/5`) e badges de estado permanecem.

## Validação após aprovação
- Typecheck/build.
- Screenshot no navegador (1280 px e 390 px) da tela da OS e do diálogo com nada selecionado e com um técnico selecionado, sem nenhuma escrita no banco (só abrir a tela e o diálogo).

## Perguntas
1. No desabilitado, prefere cinza neutro (proposto) ou o laranja apagado (só opacidade ~35%)?
2. O cartão da equipe deve ter a borda neutra do resumo (proposto) ou a borda levemente laranja do controle de tempo?
