import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupBucket, TrendPoint } from "@/types/reports";
import { GlassCard } from "@/components/app/GlassCard";
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
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard className={cn("flex flex-col p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-black uppercase tracking-wider text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </GlassCard>
  );
}

const CHART_COLORS = [
  "var(--primary)",
  "var(--status-transit)",
  "var(--status-done)",
  "var(--status-review)",
  "var(--status-pending)",
  "var(--destructive)",
  "oklch(0.7 0.13 280)",
  "oklch(0.75 0.12 180)",
];

function TooltipCard({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-background/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <div className="mb-1 font-black uppercase tracking-wider text-muted-foreground">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-foreground">{p.name}: <strong>{formatter ? formatter(p.value) : p.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

export function HorizontalBarList({
  data,
  valueFormatter,
  emptyLabel = "Sem dados no período.",
}: {
  data: GroupBucket[];
  valueFormatter?: (v: number) => string;
  emptyLabel?: string;
}) {
  if (!data.length)
    return <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.key}>
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate font-bold text-foreground">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
              style={{ width: `${Math.max(6, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatusDonut({ data }: { data: GroupBucket[] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  if (!data.length)
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem dados.</p>;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              stroke="transparent"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipCard />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-2xl font-black text-foreground tabular-nums">{total}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">OS</div>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-1 gap-1.5 text-[11px] sm:grid-cols-2">
        {data.map((d, i) => (
          <li key={d.key} className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 shrink-0 rounded-sm"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="truncate text-foreground">{d.label}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">{d.value}</span>
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
}: {
  data: TrendPoint[];
  metric?: "orders" | "hours" | "value";
  formatter?: (v: number) => string;
}) {
  if (!data.length)
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem dados no período.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<TooltipCard formatter={formatter} />} />
        <Area type="monotone" dataKey={metric} name={metric === "orders" ? "OS" : metric === "hours" ? "Horas" : "Valor"} stroke="var(--primary)" strokeWidth={2.4} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function VerticalBars({
  data,
  formatter,
}: {
  data: GroupBucket[];
  formatter?: (v: number) => string;
}) {
  if (!data.length)
    return <p className="py-8 text-center text-xs text-muted-foreground">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-12} dy={6} height={48} />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<TooltipCard formatter={formatter} />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}