import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RotateCcw } from "lucide-react";
import type { Period, PeriodRange } from "@/lib/serviceOrders/period";
import { dateInputValue, periodContextLabel } from "@/lib/serviceOrders/period";
import { cn } from "@/lib/utils";

const items: { key: Exclude<Period, "all">; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "custom", label: "Personalizado" },
];

export function MetricPeriodFilter({
  value,
  range,
  onChange,
  className,
  label = "Período operacional",
}: {
  value: Period;
  range?: PeriodRange;
  onChange: (p: Period, range?: PeriodRange) => void;
  className?: string;
  label?: string;
}) {
  const today = useMemo(() => dateInputValue(), []);
  const [draft, setDraft] = useState<Required<PeriodRange>>({
    from: range?.from || today,
    to: range?.to || range?.from || today,
  });

  useEffect(() => {
    if (value !== "custom") return;
    setDraft({
      from: range?.from || today,
      to: range?.to || range?.from || today,
    });
  }, [range?.from, range?.to, today, value]);

  const selectPreset = (next: Period) => {
    if (next === "custom") {
      const nextRange = {
        from: draft.from || today,
        to: draft.to || draft.from || today,
      };
      setDraft(nextRange);
      onChange("custom", nextRange);
      return;
    }

    onChange(next);
  };

  const applyCustom = () => {
    const nextRange = {
      from: draft.from || draft.to || today,
      to: draft.to || draft.from || today,
    };
    setDraft(nextRange);
    onChange("custom", nextRange);
  };

  const resetToToday = () => {
    const nextRange = { from: today, to: today };
    setDraft(nextRange);
    onChange("day");
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-white/[0.12] bg-white/[0.045] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_-26px_rgba(0,0,0,0.8)] backdrop-blur-md sm:w-auto",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-2 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground sm:pr-2">
          <CalendarDays size={14} className="shrink-0 text-primary" />
          <span className="truncate">{label}</span>
        </div>

        <div
          className="lemarc-smart-scroll flex max-w-full gap-1 overflow-x-auto rounded-xl bg-black/10 p-1"
          aria-label="Selecionar período"
        >
          {items.map((it) => {
            const active = value === it.key;
            return (
              <button
                key={it.key}
                type="button"
                aria-pressed={active}
                onClick={() => selectPreset(it.key)}
                className={cn(
                  "min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/70",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_10px_22px_-14px_oklch(0.72_0.19_50/0.85),inset_0_1px_0_rgba(255,255,255,0.25)]"
                    : "text-muted-foreground hover:bg-white/[0.07] hover:text-foreground",
                )}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>

      {value === "custom" && (
        <div className="mt-2 grid gap-2 border-t border-white/[0.08] pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="min-w-0">
            <span className="block px-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Inicial
            </span>
            <input
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft((current) => ({ ...current, from: event.target.value }))
              }
              className="mt-1 h-10 w-full min-w-0 rounded-xl border border-white/[0.10] bg-[#0b1729] px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="min-w-0">
            <span className="block px-1 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Final
            </span>
            <input
              type="date"
              value={draft.to}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
              className="mt-1 h-10 w-full min-w-0 rounded-xl border border-white/[0.10] bg-[#0b1729] px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <button
            type="button"
            onClick={applyCustom}
            className="min-h-10 rounded-xl bg-primary px-4 text-[10px] font-black uppercase tracking-[0.14em] text-primary-foreground shadow-[var(--shadow-glow-orange)] outline-none transition hover:bg-primary/95 focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.98]"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={resetToToday}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.98]"
            aria-label="Limpar período personalizado e voltar para hoje"
            title="Voltar para hoje"
          >
            <RotateCcw size={13} />
            Hoje
          </button>
          <p className="text-[10px] font-semibold text-muted-foreground sm:col-span-4">
            {periodContextLabel(value, draft)}
          </p>
        </div>
      )}
    </div>
  );
}
