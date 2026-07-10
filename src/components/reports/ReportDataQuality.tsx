import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Banknote,
  Building2,
  Calculator,
  CheckCircle2,
  Clock3,
  UserRoundX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportDataQuality as ReportDataQualitySummary } from "@/types/reports";
import { cn } from "@/lib/utils";

type Notice = {
  key: string;
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  tone: "warning" | "info";
  action?: boolean;
};

export function ReportDataQuality({
  quality,
  onShowPendingBilling,
}: {
  quality: ReportDataQualitySummary;
  onShowPendingBilling?: () => void;
}) {
  const allNotices: Notice[] = [
    {
      key: "pending-billing",
      title: "Cobrança pendente",
      description: "Ordens concluídas ou em revisão que ainda precisam de conferência financeira.",
      count: quality.pendingBilling,
      icon: Banknote,
      tone: "warning",
      action: true,
    },
    {
      key: "hourly-rate",
      title: "Valor/hora não informado",
      description: "Sem precificação, o valor estimado da ordem não pode ser calculado.",
      count: quality.withoutHourlyRate,
      icon: Calculator,
      tone: "warning",
    },
    {
      key: "worked-minutes",
      title: "Tempo trabalhado ausente",
      description: "Ordens sem registro manual nem intervalo válido entre início e conclusão.",
      count: quality.withoutWorkedMinutes,
      icon: Clock3,
      tone: "warning",
    },
    {
      key: "technician",
      title: "Técnico não atribuído",
      description: "Registros sem responsável técnico reduzem a precisão da produtividade.",
      count: quality.withoutTechnician,
      icon: UserRoundX,
      tone: "warning",
    },
    {
      key: "unit",
      title: "Unidade não informada",
      description: "A unidade é necessária para uma leitura operacional completa por cliente.",
      count: quality.withoutUnit,
      icon: Building2,
      tone: "warning",
    },
    {
      key: "derived-time",
      title: "Tempo calculado automaticamente",
      description:
        "O total usa o intervalo entre início e conclusão quando não há lançamento manual.",
      count: quality.derivedWorkedMinutes,
      icon: Clock3,
      tone: "info",
    },
  ];
  const notices = allNotices.filter((notice) => notice.count > 0);

  const issueCount = notices.filter((notice) => notice.tone === "warning").length;

  return (
    <section aria-labelledby="report-quality-title" className="space-y-3">
      <div className="lemarc-report-section-heading">
        <div className="min-w-0">
          <p className="lemarc-report-section-kicker">Confiabilidade</p>
          <h2 id="report-quality-title" className="lemarc-report-section-title">
            Qualidade dos dados
          </h2>
        </div>
        <span className="text-[11px] font-bold text-slate-700">
          {issueCount === 0
            ? "Sem pendências essenciais"
            : `${issueCount} tipo${issueCount === 1 ? "" : "s"} de pendência`}
        </span>
      </div>

      {notices.length === 0 ? (
        <div className="lemarc-report-card flex min-w-0 items-center gap-3 p-4">
          <CheckCircle2 className="shrink-0 text-status-done" size={20} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-black text-white">Dados essenciais completos</p>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-slate-300/82">
              As ordens filtradas possuem os principais campos necessários para análise e cobrança.
            </p>
          </div>
        </div>
      ) : (
        <div className="lemarc-report-card overflow-hidden p-0">
          <ul className="divide-y divide-white/[0.08]">
            {notices.map((notice) => {
              const Icon = notice.icon;
              return (
                <li
                  key={notice.key}
                  className="flex min-w-0 flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 shrink-0",
                        notice.tone === "warning" ? "text-status-review" : "text-status-transit",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black leading-tight text-white">
                          {notice.title}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-black tabular-nums",
                            notice.tone === "warning"
                              ? "border-status-review/35 bg-status-review/12 text-status-review"
                              : "border-status-transit/35 bg-status-transit/12 text-status-transit",
                          )}
                          aria-label={`${notice.count} registros afetados`}
                        >
                          {notice.count}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300/82">
                        {notice.description}
                      </p>
                    </div>
                  </div>
                  {notice.action && onShowPendingBilling && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="lemarc-report-action h-10 w-full shrink-0 gap-2 rounded-xl px-3 text-xs font-black sm:w-auto"
                      onClick={onShowPendingBilling}
                    >
                      Ver registros
                      <ArrowRight size={14} aria-hidden="true" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
