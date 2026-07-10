import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type OperationalMetric = {
  label: string;
  value: ReactNode;
  detail?: string;
  evidence?: string;
  tone?: "default" | "warning";
};

export function OperationalPageHeader({
  eyebrow,
  title,
  description,
  action,
  metrics,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: ReactNode;
  metrics: OperationalMetric[];
}) {
  return (
    <section className="lemarc-operational-header">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <p className="lemarc-context-label">{eyebrow}</p>
          <h1 className="lemarc-page-title">{title}</h1>
          <p className="lemarc-page-description">{description}</p>
        </div>
        <div className="w-full shrink-0 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">{action}</div>
      </div>

      <div className="lemarc-operational-metrics" aria-label={`Indicadores de ${title}`}>
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn(
              "lemarc-operational-metric",
              metric.tone === "warning" && "lemarc-operational-metric--warning",
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="lemarc-data-label">{metric.label}</p>
              {metric.evidence && <span className="lemarc-evidence-label">{metric.evidence}</span>}
            </div>
            <p className="lemarc-metric-value">{metric.value}</p>
            {metric.detail && <p className="lemarc-metric-detail">{metric.detail}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function OperationalFilterBar({
  search,
  children,
  activeCount,
  resultLabel,
  onReset,
}: {
  search: ReactNode;
  children: ReactNode;
  activeCount: number;
  resultLabel: string;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-2" aria-label="Busca e filtros">
      <div className="lemarc-filter-bar">
        <div className="min-w-0 flex-1">{search}</div>

        <div className="lemarc-filter-controls hidden md:flex">{children}</div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="lemarc-secondary-action lemarc-pressable inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold md:hidden"
              aria-label={
                activeCount > 0 ? `Abrir filtros, ${activeCount} ativos` : "Abrir filtros"
              }
            >
              <SlidersHorizontal size={16} />
              Filtros
              {activeCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-black text-primary-foreground tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="lemarc-filter-sheet !bottom-0 !left-0 !right-0 !top-auto !max-w-none !translate-x-0 !translate-y-0 sm:!rounded-b-none sm:!rounded-t-[1.35rem]">
            <DialogHeader className="pr-9 text-left">
              <DialogTitle className="font-display text-xl font-bold text-white">
                Filtrar resultados
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Ajuste os critérios sem perder a busca atual.
              </DialogDescription>
            </DialogHeader>
            <div className="lemarc-filter-sheet-controls">{children}</div>
            <div className="grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={onReset}
                disabled={activeCount === 0}
                className="lemarc-secondary-action lemarc-pressable min-h-11 rounded-xl px-3 text-sm font-bold disabled:opacity-45"
              >
                Limpar filtros
              </button>
              <DialogClose asChild>
                <button
                  type="button"
                  className="lemarc-primary-action lemarc-pressable min-h-11 rounded-xl px-3 text-sm font-bold"
                >
                  Ver resultados
                </button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-medium text-slate-300 tabular-nums" aria-live="polite">
          {resultLabel}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="lemarc-filter-reset lemarc-pressable inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold"
          >
            <X size={12} />
            {activeCount} {activeCount === 1 ? "filtro ativo" : "filtros ativos"}
          </button>
        )}
      </div>
    </section>
  );
}
