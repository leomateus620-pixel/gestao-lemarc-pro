/* eslint-disable react-refresh/only-export-components -- fixture isolada, montada diretamente pelo Vite apenas na validação responsiva */
import { createRoot } from "react-dom/client";
import {
  BarChart3,
  ClipboardList,
  Clock,
  DollarSign,
  HardHat,
  Home,
  LogOut,
  MoreHorizontal,
  PercentCircle,
  Plus,
  Receipt,
  Timer,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { ReportsKpiGrid, type Kpi } from "../../src/components/reports/ReportsKpiGrid";
import { ReportBreakdowns } from "../../src/components/reports/ReportBreakdowns";
import { ReportDataQuality } from "../../src/components/reports/ReportDataQuality";
import {
  ReportChartCard,
  StatusDonut,
  TrendComparison,
} from "../../src/components/reports/ReportCharts";
import type { ReportSeries } from "../../src/types/reports";
import "./relatorios-responsive.css";

const kpis: Kpi[] = [
  {
    label: "OS no período",
    value: "12.589",
    hint: "8.742 concluídas · 1.204 em campo",
    icon: Wrench,
    tone: "primary",
    wideOnMobile: true,
  },
  {
    label: "Horas trabalhadas",
    value: "2.345,7h",
    hint: "Total de horas registradas nas ordens de serviço.",
    icon: Clock,
    wideOnMobile: true,
  },
  {
    label: "Valor estimado",
    value: "R$ 9.999.999",
    hint: "128 OS com horas, mas sem valor/hora cadastrado.",
    icon: DollarSign,
    tone: "success",
    alert: true,
    wideOnMobile: true,
  },
  {
    label: "Tempo médio de conclusão",
    value: "Não disponível",
    hint: "Não há OS fechada suficiente para este cálculo.",
    icon: Timer,
    unavailable: true,
    wideOnMobile: true,
  },
  {
    label: "Aguardando cobrança",
    value: "128",
    hint: "Ordens prontas para conferência financeira.",
    icon: Receipt,
    tone: "warning",
    alert: true,
  },
  {
    label: "Taxa de conclusão",
    value: "69%",
    hint: "8.742 de 12.589 ordens concluídas.",
    icon: PercentCircle,
    tone: "success",
  },
  {
    label: "Ticket médio estimado",
    value: "R$ 18.540",
    hint: "Valor estimado médio por OS concluída.",
    icon: TrendingUp,
  },
  {
    label: "OS em campo",
    value: "1.204",
    hint: "Ordens despachadas, em trânsito ou em execução.",
    icon: Wrench,
    tone: "primary",
  },
];

const series: ReportSeries = {
  byStatus: [
    { key: "finished", label: "Finalizadas", value: 8742 },
    { key: "running", label: "Em execução", value: 1204 },
    { key: "pending", label: "Pendentes", value: 1615 },
    { key: "review", label: "Em revisão", value: 1028 },
  ],
  byPriority: [
    { key: "alta", label: "Alta", value: 3200 },
    { key: "media", label: "Média", value: 6100 },
    { key: "baixa", label: "Baixa", value: 3289 },
  ],
  byServiceType: [
    { key: "mecanica", label: "Mecânica", value: 4800 },
    { key: "automacao", label: "Automação", value: 3550 },
    { key: "eletrica", label: "Elétrica", value: 4239 },
  ],
  byClient: [
    {
      key: "cliente-longo",
      label: "Indústria Brasileira de Equipamentos e Soluções Operacionais de Alta Complexidade",
      value: 4800,
    },
    { key: "cliente-2", label: "Metalúrgica Horizonte", value: 3550 },
  ],
  byTechnicianHours: [
    {
      key: "tecnico-longo",
      label: "Alexandre de Oliveira Nascimento e Silva",
      value: 987.5,
    },
    { key: "tecnico-2", label: "Mariana Costa", value: 632.2 },
  ],
  byClientValue: [
    { key: "cliente-longo", label: "Indústria Brasileira de Equipamentos", value: 5220000 },
    { key: "cliente-2", label: "Metalúrgica Horizonte", value: 3110000 },
  ],
  avgLeadByTechnician: [
    { key: "tecnico-2", label: "Mariana Costa", value: 1420 },
    { key: "tecnico-longo", label: "Alexandre de Oliveira Nascimento e Silva", value: 1810 },
  ],
  trend: [
    {
      month: "2026-03",
      label: "mar. 26",
      orders: 3200,
      completed: 2100,
      hours: 510,
      value: 1800000,
    },
    {
      month: "2026-04",
      label: "abr. 26",
      orders: 2700,
      completed: 2300,
      hours: 480,
      value: 2100000,
    },
    {
      month: "2026-05",
      label: "mai. 26",
      orders: 3400,
      completed: 2600,
      hours: 620,
      value: 2900000,
    },
    {
      month: "2026-06",
      label: "jun. 26",
      orders: 3289,
      completed: 1742,
      hours: 735.7,
      value: 3199999,
    },
  ],
};

const navItems = [
  { label: "Início", mobile: "Início", compact: "Início", icon: Home },
  { label: "Ordens", mobile: "Ordens", compact: "Ordens", icon: ClipboardList },
  { label: "Clientes", mobile: "Clientes", compact: "Clientes", icon: Users },
  { label: "Colaboradores", mobile: "Colabs.", compact: "Colabs.", icon: HardHat },
  { label: "Relatórios", mobile: "Relatórios", compact: "Relat.", icon: BarChart3 },
  { label: "Mais", mobile: "Mais", compact: "Mais", icon: MoreHorizontal },
];

function Fixture() {
  return (
    <div className="lemarc-app-bg min-h-[100dvh] overflow-x-hidden">
      <header className="lemarc-app-header fixed inset-x-0 top-0 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-6 lg:px-8">
        <div className="lemarc-solid-topbar mx-auto max-w-7xl rounded-[1.15rem] px-2.5 py-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img
              src="/branding/lemarc-login-logo.png"
              alt="Gestão Lemarc"
              className="h-9 w-auto max-w-[132px] shrink-0 object-contain"
            />
            <div className="min-w-0 flex-1" />
            <button
              className="lemarc-pressable grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"
              aria-label="Nova OS"
            >
              <Plus size={18} />
            </button>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/45 bg-primary/18 text-[10px] font-black text-primary">
              LT
            </span>
            <button
              className="lemarc-pressable grid size-10 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.07] text-slate-300"
              aria-label="Sair"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="lemarc-shell-main lemarc-shell-main--nav mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lemarc-report-page space-y-5 pt-2">
          <header className="lemarc-report-hero">
            <p className="lemarc-report-section-kicker text-primary">Relatórios operacionais</p>
            <h1 className="lemarc-report-page-title mt-1.5 text-white">Cobrança e produtividade</h1>
            <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-200/86">
              Acompanhe ordens, horas, valores e pendências com dados da operação e filtros por
              período.
            </p>
          </header>

          <section className="lemarc-report-card p-4">
            <div className="lemarc-report-field-label">Período analisado</div>
            <div className="mt-2 flex min-w-0 flex-col gap-2 min-[390px]:flex-row">
              <select
                className="lemarc-report-control h-11 min-h-11 w-full min-w-0 rounded-xl px-3 font-bold min-[390px]:flex-1"
                defaultValue="month"
                aria-label="Período"
              >
                <option value="month">Mês (30 dias)</option>
              </select>
              <button className="lemarc-report-action h-11 min-h-11 w-full min-w-0 rounded-xl px-4 font-black min-[390px]:flex-1">
                Filtros avançados · 4
              </button>
            </div>
          </section>

          <section className="lemarc-report-command-panel">
            <div className="min-w-0">
              <p className="lemarc-report-section-kicker">Ações principais</p>
              <h2 className="text-sm font-black text-white">Gere o documento adequado à análise</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
              <button className="lemarc-report-action-primary h-11 rounded-xl px-4 font-black">
                Gerar relatório gerencial
              </button>
              <button className="lemarc-report-action h-11 rounded-xl px-4 font-black">
                Relatório por cliente
              </button>
            </div>
          </section>

          <ReportsKpiGrid kpis={kpis} />

          <section className="space-y-3">
            <div className="lemarc-report-section-heading">
              <div>
                <p className="lemarc-report-section-kicker">Comparativo</p>
                <h2 className="lemarc-report-section-title">Volume e situação das ordens</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <ReportChartCard title="Abertas e concluídas" className="lg:col-span-2">
                <TrendComparison data={series.trend} />
              </ReportChartCard>
              <ReportChartCard title="OS por status">
                <StatusDonut data={series.byStatus} />
              </ReportChartCard>
            </div>
          </section>

          <ReportBreakdowns series={series} />
          <ReportDataQuality
            quality={{
              withoutUnit: 42,
              withoutTechnician: 18,
              withoutWorkedMinutes: 96,
              withoutHourlyRate: 128,
              pendingBilling: 74,
              derivedWorkedMinutes: 31,
            }}
          />

          <section className="lemarc-report-export-panel">
            <div>
              <p className="lemarc-report-section-kicker">Exportação</p>
              <h2 className="text-sm font-black text-white">Leve os resultados para conferência</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
              <button className="lemarc-report-action h-11 rounded-xl px-4 font-black">
                Exportar CSV
              </button>
              <button className="lemarc-report-action h-11 rounded-xl px-4 font-black">
                Imprimir / PDF
              </button>
            </div>
          </section>
        </div>
      </main>

      <nav
        className="lemarc-bottom-nav fixed inset-x-0 bottom-0 flex justify-center"
        aria-label="Navegação principal"
      >
        <div
          className="lemarc-bottom-nav-shell mx-auto mb-2 grid w-full max-w-lg gap-0.5 p-1"
          style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href="#"
                className="lemarc-bottom-nav-item lemarc-pressable"
                data-status={item.label === "Relatórios" ? "active" : undefined}
                aria-label={item.label}
              >
                <Icon className="lemarc-bottom-nav-icon" />
                <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--desktop">
                  {item.label}
                </span>
                <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--mobile">
                  {item.mobile}
                </span>
                <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--compact">
                  {item.compact}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
