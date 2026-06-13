import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { StatCard } from "@/components/app/StatCard";
import { ReportCard } from "@/components/app/ReportCard";
import { reportSummary, horasPorColaborador, osPorCliente, osPorStatus } from "@/lib/mock/reports";
import { Clock, DollarSign, FileSpreadsheet, FileText, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/relatorios")({ head: () => ({ meta: [{ title: "Relatórios — Gestão Lemarc" }] }), component: Relatorios });
function Relatorios() { return <AppShell title="Relatórios">
  <div className="mt-2 grid grid-cols-2 gap-3"><StatCard label="OS no mês" value={reportSummary.osMes} icon={Wrench} accent /><StatCard label="Horas totais" value={reportSummary.horasTotais.toLocaleString("pt-BR")} icon={Clock} /><StatCard label="Valor estimado" value={`R$ ${Math.round(reportSummary.valorEstimado/1000)}k`} hint="pré-cobrança" icon={DollarSign} /><StatCard label="Tempo médio" value={reportSummary.tempoMedio} icon={TrendingUp} /></div>
  <div className="mt-5 space-y-4"><ReportCard title="Horas por colaborador" data={horasPorColaborador} /><ReportCard title="OS por cliente" data={osPorCliente} /><ReportCard title="OS por status" data={osPorStatus} /></div>
  <div className="mt-5 grid grid-cols-2 gap-3"><Button className="h-12 gap-2 shadow-[var(--shadow-glow-orange)]"><FileText size={18} />Exportar PDF</Button><Button variant="secondary" className="h-12 gap-2 bg-secondary text-foreground"><FileSpreadsheet size={18} />Exportar Excel</Button></div>
</AppShell>; }
