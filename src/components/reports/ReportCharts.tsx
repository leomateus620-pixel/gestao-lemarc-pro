import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupBucket, TrendPoint } from "@/types/reports";
import { cn } from "@/lib/utils";

export function ReportChartCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("lemarc-report-card flex min-h-[250px] flex-col p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-black leading-tight text-white sm:text-[15px]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-300/78 sm:text-xs">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function ChartEmptyState({
  label = "Sem dados suficientes para este gráfico no período selecionado.",
}: {
  label?: string;
}) {
  return (
    <div className="lemarc-report-empty px-5 py-8">
      <div>
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-primary/80" />
        <p className="mx-auto max-w-xs text-xs font-semibold leading-relaxed text-slate-200/82">
          {label}
        </p>
      </div>
    </div>
  );
}

const CHART_COLORS = [
  "oklch(0.78 0.19 55)",
  "oklch(0.72 0.15 230)",
  "oklch(0.72 0.16 155)",
  "oklch(0.82 0.16 90)",
  "oklch(0.77 0.035 250)",
  "oklch(0.64 0.22 25)",
  "oklch(0.72 0.13 280)",
  "oklch(0.75 0.12 185)",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "var(--status-pending)",
  dispatched: "var(--status-transit)",
  transit: "var(--status-transit)",
  running: "var(--status-running)",
  finished: "var(--status-done)",
  review: "var(--status-review)",
  approved: "var(--status-done)",
  cancelled: "var(--destructive)",
};

function statusColor(key: string, index: number) {
  return STATUS_COLORS[key] ?? CHART_COLORS[index % CHART_COLORS.length];
}

const GRID_STROKE = "oklch(1 0 0 / 0.095)";
const AXIS_STROKE = "oklch(0.82 0.018 250 / 0.82)";

type TooltipItem = {
  color?: string;
  name?: string;
  value?: number | string;
  payload?: { fill?: string };
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function TooltipCard({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-[#101a29]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur">
      {label && (
        <div className="mb-1.5 font-black uppercase tracking-[0.12em] text-slate-300">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((p, i) => {
          const value = Number(p.value ?? 0);
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: p.color || p.payload?.fill }}
              />
              <span className="text-slate-100">
                {p.name}:{" "}
                <strong className="font-black text-white">
                  {formatter ? formatter(value) : p.value}
                </strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function truncateAxisLabel(value: string) {
  return value.length > 18 ? `${value.slice(0, 16)}...` : value;
}

function hasUsableValues(data: GroupBucket[]) {
  return data.some((d) => d.value > 0);
}

export function HorizontalBarList({
  data,
  valueFormatter,
  emptyLabel = "Sem dados suficientes para este gráfico no período selecionado.",
}: {
  data: GroupBucket[];
  valueFormatter?: (v: number) => string;
  emptyLabel?: string;
}) {
  if (!data.length || !hasUsableValues(data)) return <ChartEmptyState label={emptyLabel} />;

  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d, index) => {
        const width = d.value > 0 ? Math.max(4, (d.value / max) * 100) : 0;
        const color = CHART_COLORS[index % CHART_COLORS.length];
        return (
          <div key={d.key} className="group">
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span
                className="min-w-0 line-clamp-2 break-words font-bold leading-tight text-slate-100"
                title={d.label}
              >
                {d.label}
              </span>
              <span className="shrink-0 font-display text-[12px] font-black tabular-nums text-slate-200">
                {valueFormatter ? valueFormatter(d.value) : d.value}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/28 ring-1 ring-white/[0.07]">
              <div
                className="lemarc-report-chart-bar h-full rounded-full shadow-lg transition-[width,filter] duration-200 group-hover:brightness-110"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${color}, color-mix(in oklab, ${color} 68%, white 18%))`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatusDonut({ data }: { data: GroupBucket[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  if (!data.length || total <= 0) return <ChartEmptyState />;

  return (
    <div
      className="flex flex-col items-center gap-4 sm:flex-row sm:items-center"
      role="img"
      aria-label={`Distribuição de ${total} ordens de serviço por status`}
    >
      <span className="sr-only">
        {data.map((item) => `${item.label}: ${item.value}`).join("; ")}
      </span>
      <div className="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={3}
              stroke="oklch(0.13 0.035 252)"
              strokeWidth={2}
              isAnimationActive={!reducedMotion}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={statusColor(data[i].key, i)} />
              ))}
            </Pie>
            <Tooltip content={<TooltipCard />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-3xl font-black text-white tabular-nums">{total}</div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
              OS
            </div>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
        {data.map((d, i) => (
          <li
            key={d.key}
            className="flex min-w-0 items-center gap-2 rounded-lg bg-white/[0.045] px-2 py-1.5"
          >
            <span
              className="inline-block size-2.5 shrink-0 rounded-sm"
              style={{ background: statusColor(d.key, i) }}
            />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-100" title={d.label}>
              {d.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-300">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendArea({
  data,
  metric = "orders",
  formatter,
  axisFormatter,
}: {
  data: TrendPoint[];
  metric?: "orders" | "hours" | "value";
  formatter?: (v: number) => string;
  axisFormatter?: (v: number) => string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  if (!data.length || data.every((d) => d[metric] <= 0)) return <ChartEmptyState />;

  return (
    <div
      className="h-[220px] w-full sm:h-[238px]"
      role="img"
      aria-label={`Evolução de ${metric === "orders" ? "ordens" : metric === "hours" ? "horas" : "valor estimado"} no período`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -8 }}>
          <defs>
            <linearGradient id={`trendFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.78 0.19 55)" stopOpacity={0.58} />
              <stop offset="72%" stopColor="oklch(0.78 0.19 55)" stopOpacity={0.08} />
              <stop offset="100%" stopColor="oklch(0.78 0.19 55)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 6" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS_STROKE, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            minTickGap={12}
          />
          <YAxis
            tick={{ fill: AXIS_STROKE, fontSize: 11, fontWeight: 700 }}
            tickFormatter={axisFormatter}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<TooltipCard formatter={formatter} />} />
          <Area
            type="monotone"
            dataKey={metric}
            name={metric === "orders" ? "OS" : metric === "hours" ? "Horas" : "Valor"}
            stroke="oklch(0.82 0.18 62)"
            strokeWidth={3}
            fill={`url(#trendFill-${metric})`}
            dot={{ r: 3, strokeWidth: 2, fill: "oklch(0.13 0.035 252)" }}
            activeDot={{ r: 5, strokeWidth: 2, fill: "oklch(0.9 0.14 72)" }}
            isAnimationActive={!reducedMotion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendComparison({ data }: { data: TrendPoint[] }) {
  const reducedMotion = usePrefersReducedMotion();
  if (!data.length || data.every((point) => point.orders <= 0)) return <ChartEmptyState />;

  return (
    <div
      className="w-full"
      role="img"
      aria-label="Comparação mensal entre ordens abertas e ordens concluídas"
    >
      <span className="sr-only">
        {data
          .map((point) => `${point.label}: ${point.orders} abertas e ${point.completed} concluídas`)
          .join("; ")}
      </span>
      <ul
        className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-200"
        aria-label="Legenda do gráfico"
      >
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />
          Abertas
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-status-done" aria-hidden="true" />
          Concluídas
        </li>
      </ul>
      <div className="h-[220px] w-full sm:h-[238px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="4 6" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: AXIS_STROKE, fontSize: 11, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              minTickGap={12}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: AXIS_STROKE, fontSize: 11, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipCard />} cursor={{ fill: "oklch(1 0 0 / 0.045)" }} />
            <Bar
              dataKey="orders"
              name="Abertas"
              fill="var(--primary)"
              radius={[6, 6, 2, 2]}
              maxBarSize={40}
              isAnimationActive={!reducedMotion}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Concluídas"
              stroke="var(--status-done)"
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: "oklch(0.13 0.035 252)" }}
              activeDot={{ r: 5, strokeWidth: 2, fill: "var(--status-done)" }}
              isAnimationActive={!reducedMotion}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function VerticalBars({
  data,
  formatter,
  emptyLabel = "Sem dados suficientes para este gráfico no período selecionado.",
}: {
  data: GroupBucket[];
  formatter?: (v: number) => string;
  emptyLabel?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  if (!data.length || !hasUsableValues(data)) return <ChartEmptyState label={emptyLabel} />;

  return (
    <div
      className="h-[220px] w-full sm:h-[238px]"
      role="img"
      aria-label="Gráfico de barras do período"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 14, bottom: 4, left: -8 }}
          barCategoryGap="26%"
        >
          <CartesianGrid strokeDasharray="4 6" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS_STROKE, fontSize: 10, fontWeight: 700 }}
            tickFormatter={truncateAxisLabel}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-12}
            dy={8}
            height={58}
          />
          <YAxis
            tick={{ fill: AXIS_STROKE, fontSize: 11, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip
            content={<TooltipCard formatter={formatter} />}
            cursor={{ fill: "oklch(1 0 0 / 0.055)" }}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 2, 2]}
            maxBarSize={54}
            isAnimationActive={!reducedMotion}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
