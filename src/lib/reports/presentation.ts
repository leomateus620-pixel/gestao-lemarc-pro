export type ReportEmptyState = {
  title: string;
  description: string;
};

export function getReportEmptyState(activeFilters: number): ReportEmptyState {
  if (activeFilters > 0) {
    return {
      title: "Nenhuma OS corresponde aos filtros",
      description:
        "Revise os filtros avançados ou limpe as condições aplicadas para ampliar a busca.",
    };
  }

  return {
    title: "Nenhuma OS no período selecionado",
    description: "Selecione outro período para consultar os dados operacionais.",
  };
}
