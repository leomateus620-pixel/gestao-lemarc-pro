import { Suspense, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BriefcaseBusiness, CalendarDays, Clock3, Search, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import {
  dateInputValue,
  formatCurrency,
  formatMinutes,
  formatShortDate,
  inDateRange,
  monthRange,
  todayRange,
  weekRange,
} from "@/components/colaboradores/format";
import { Input } from "@/components/ui/input";
import { useTechnicianLaborHistoryQuery, useTechniciansQuery } from "@/hooks/useServiceOrders";
import { collaboratorLaborFor } from "@/lib/serviceOrders/collaborators";
import { statusLabel, type ServiceOrderStatus } from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/colaboradores/$id/horas")({
  head: () => ({ meta: [{ title: "Horas do colaborador — Gestão Lemarc" }] }),
  component: ColaboradorHorasPage,
});

type Period = "today" | "week" | "month" | "custom" | "all";

function ColaboradorHorasPage() {
  return (
    <AppShell title="Horas trabalhadas" back>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white/[0.06]" />}>
        <HorasContent />
      </Suspense>
    </AppShell>
  );
}

function HorasContent() {
  const { id } = Route.useParams();
  const { data: technicians } = useTechniciansQuery();
  const { data: laborHistory } = useTechnicianLaborHistoryQuery();
  const technician = technicians.find((item) => item.id === id);
  if (!technician) throw notFound();

  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(dateInputValue(monthRange().from));
  const [to, setTo] = useState(dateInputValue(monthRange().to));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const range = resolveRange(period, from, to);
  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collaboratorLaborFor(laborHistory, id).filter((entry) => {
      const order = entry.service_order;
      if (!inDateRange(entry.work_date, range.from, range.to)) return false;
      if (status !== "all" && order?.status !== status) return false;
      if (!q) return true;
      const haystack = [
        order?.number ? String(order.number) : "",
        order?.title,
        order?.client?.name,
        order?.client_unit?.name,
        entry.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [id, laborHistory, query, range.from, range.to, status]);

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration_minutes, 0);
  const totalCents = entries.reduce((sum, entry) => sum + entry.subtotal_cents, 0);
  const orderIds = new Set(entries.map((entry) => entry.service_order_id));
  const average = orderIds.size > 0 ? Math.round(totalMinutes / orderIds.size) : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-4">
      <section className="lemarc-wizard-card p-5 sm:p-6">
        <p className="lemarc-technical-label">Apontamentos reais</p>
        <h1 className="font-display text-2xl font-black text-white">{technician.full_name}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          Horas trabalhadas por OS, cliente, data e subtotal.
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lemarc-smart-scroll">
          <Kpi label="Horas no período" value={formatMinutes(totalMinutes)} icon={Clock3} />
          <Kpi label="Mão de obra" value={formatCurrency(totalCents)} icon={BriefcaseBusiness} />
          <Kpi label="OS atendidas" value={String(orderIds.size)} icon={CalendarDays} />
          <Kpi label="Média por OS" value={formatMinutes(average)} icon={Clock3} />
        </div>
      </section>

      <section className="lemarc-horizontal-row flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar cliente, OS ou descrição..."
            className="lemarc-form-control h-11 rounded-full pl-10"
          />
        </div>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value as Period)}
          className="lemarc-form-control h-11 rounded-full px-3 text-xs font-bold"
        >
          <option value="today">Hoje</option>
          <option value="week">Semana</option>
          <option value="month">Mês</option>
          <option value="custom">Período</option>
          <option value="all">Tudo</option>
        </select>
        {period === "custom" && (
          <>
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="lemarc-form-control h-11 rounded-full"
            />
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="lemarc-form-control h-11 rounded-full"
            />
          </>
        )}
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="lemarc-form-control h-11 rounded-full px-3 text-xs font-bold"
        >
          <option value="all">Status da OS</option>
          {Object.entries(statusLabel).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2">
        {entries.length === 0 ? (
          <div className="lemarc-island-row p-6 text-center text-sm font-semibold text-slate-300">
            Nenhum apontamento encontrado para os filtros atuais.
          </div>
        ) : (
          entries.map((entry) => {
            const order = entry.service_order;
            const statusText = order?.status
              ? statusLabel[order.status as ServiceOrderStatus]
              : "Sem status";
            return (
              <Link
                key={entry.id}
                to="/ordens/$id"
                params={{ id: entry.service_order_id }}
                className="lemarc-island-row grid gap-2 p-4 lg:grid-cols-[0.65fr_0.8fr_1fr_1fr_0.65fr_0.65fr_0.7fr_0.75fr_1fr_0.8fr] lg:items-center"
              >
                <span className="font-display text-sm font-black text-white">
                  {formatShortDate(entry.work_date)}
                </span>
                <span className="font-black text-primary">
                  {order?.number ? `#${order.number}` : "OS"}
                </span>
                <span className="min-w-0 truncate text-sm font-bold text-slate-200">
                  {order?.client?.name ?? "Cliente não informado"}
                </span>
                <span className="min-w-0 truncate text-xs font-semibold text-slate-400">
                  {order?.client_unit?.name ?? order?.client?.unit ?? "Unidade não informada"}
                </span>
                <span className="text-xs font-black tabular-nums text-slate-300">
                  {entry.start_time.slice(0, 5)}
                </span>
                <span className="text-xs font-black tabular-nums text-slate-300">
                  {entry.end_time.slice(0, 5)}
                </span>
                <span className="text-xs font-black tabular-nums text-white">
                  {formatMinutes(entry.duration_minutes)}
                </span>
                <span className="text-xs font-black tabular-nums text-slate-300">
                  {formatCurrency(entry.hourly_rate_cents)}
                </span>
                <span className="text-xs font-black tabular-nums text-primary">
                  {formatCurrency(entry.subtotal_cents)}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {statusText}
                </span>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}

function resolveRange(period: Period, from: string, to: string) {
  if (period === "today") return todayRange();
  if (period === "week") return weekRange();
  if (period === "month") return monthRange();
  if (period === "all") return { from: null, to: null };
  return {
    from: from ? new Date(`${from}T00:00:00`) : null,
    to: to ? new Date(`${to}T23:59:59`) : null,
  };
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="lemarc-compact-metric min-w-[10rem]">
      <div className="flex items-center justify-between gap-2">
        <p className="lemarc-technical-label">{label}</p>
        <Icon size={14} className="text-primary" />
      </div>
      <p className="mt-1 font-display text-lg font-black text-white tabular-nums">{value}</p>
    </div>
  );
}
