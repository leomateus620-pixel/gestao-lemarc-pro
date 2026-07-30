import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, ClipboardList, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "@/hooks/useUserRole";
import { updateServiceOrderExecutionReport } from "@/lib/api/serviceOrders.functions";
import type { ServiceOrder } from "@/types/serviceOrder";

const MAX_LENGTH = 4000;

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export function ExecutionReportSection({ order }: { order: ServiceOrder }) {
  const { isAdmin, isTecnico } = useUserRole();
  const queryClient = useQueryClient();
  const current = order.execution_report?.trim() ?? "";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(current);

  useEffect(() => {
    if (!editing) setText(current);
  }, [current, editing]);

  const locked = order.status === "approved" || order.status === "cancelled";
  const canEdit = isAdmin || (isTecnico && !locked);

  const save = useServerFn(updateServiceOrderExecutionReport);
  const mutation = useMutation({
    mutationFn: (report: string) => save({ data: { id: order.id, report } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      setEditing(false);
      toast.success("Relato do serviço salvo.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o relato.");
    },
  });

  return (
    <section className="mt-5">
      <GlassCard className="overflow-hidden p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Responsabilidade do técnico
            </p>
            <h3 className="font-display text-base font-black text-foreground">
              Serviço executado — relato
            </h3>
          </div>
          {current ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
              <CheckCircle2 size={12} /> Preenchido
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">
              <AlertCircle size={12} /> Pendente
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              rows={7}
              autoFocus
              placeholder="Descreva o que foi executado: atividades realizadas, peças/materiais aplicados, testes e condição final do equipamento."
              className="min-h-[150px] resize-y text-sm leading-relaxed"
            />
            <div className="mt-1 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {text.length}/{MAX_LENGTH}
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setText(current);
                  setEditing(false);
                }}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button onClick={() => mutation.mutate(text)} disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar relato"}
              </Button>
            </div>
          </div>
        ) : current ? (
          <div className="mt-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {current}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                {order.execution_report_updated_at
                  ? `Atualizado em ${fmtDateTime(order.execution_report_updated_at)}`
                  : "Relato registrado nesta OS."}
              </p>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <PencilLine size={14} /> Editar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
            <ClipboardList size={20} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              Descreva o que foi executado antes de coletar a assinatura.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Este relato é de responsabilidade do técnico e sai no PDF da OS.
            </p>
            {canEdit ? (
              <Button className="mt-3" onClick={() => setEditing(true)}>
                <PencilLine size={14} /> Preencher relato
              </Button>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Aguardando preenchimento pelo técnico responsável.
              </p>
            )}
          </div>
        )}
      </GlassCard>
    </section>
  );
}