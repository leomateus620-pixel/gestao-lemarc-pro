import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Pencil, Plus, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createLaborEntry,
  deleteLaborEntry,
  updateLaborEntry,
} from "@/lib/api/financials.functions";
import {
  computeDurationMinutes,
  computeSubtotalCents,
  formatBRL,
  formatHHmm,
  parseBRLToCents,
} from "@/lib/serviceOrders/finance";
import { getOrderTechnicians } from "@/lib/serviceOrders/technicians";
import type { LaborEntry } from "@/types/financials";
import type { ServiceOrder } from "@/types/serviceOrder";

type Props = {
  order: ServiceOrder;
  entries: LaborEntry[];
};

type DraftState = {
  technician_id: string;
  role: string;
  work_date: string;
  start_time: string;
  end_time: string;
  rate_input: string;
};

function entryToDraft(e: LaborEntry): DraftState {
  return {
    technician_id: e.technician_id ?? "",
    role: e.role ?? "",
    work_date: e.work_date,
    start_time: e.start_time.slice(0, 5),
    end_time: e.end_time.slice(0, 5),
    rate_input: (e.hourly_rate_cents / 100).toFixed(2).replace(".", ","),
  };
}

function formatDateBR(v: string) {
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
}

export function LaborEntriesEditor({ order, entries }: Props) {
  const qc = useQueryClient();
  const techs = useMemo(() => getOrderTechnicians(order), [order]);
  const updateFn = useServerFn(updateLaborEntry);
  const deleteFn = useServerFn(deleteLaborEntry);
  const createFn = useServerFn(createLaborEntry);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<DraftState | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["order-financials", order.id] });
    qc.invalidateQueries({ queryKey: ["service-orders"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["technician-labor-history"] });
  };

  const updateMut = useMutation({
    mutationFn: (vars: { entryId: string; draft: DraftState }) =>
      updateFn({
        data: {
          entryId: vars.entryId,
          patch: {
            technician_id: vars.draft.technician_id,
            role: vars.draft.role.trim() || null,
            work_date: vars.draft.work_date,
            start_time: vars.draft.start_time,
            end_time: vars.draft.end_time,
            hourly_rate_cents: parseBRLToCents(vars.draft.rate_input),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Apontamento atualizado.");
      setEditingId(null);
      setDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao atualizar."),
  });

  const deleteMut = useMutation({
    mutationFn: (entryId: string) => deleteFn({ data: { entryId } }),
    onSuccess: () => {
      toast.success("Apontamento excluído.");
      setConfirmDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao excluir."),
  });

  const createMut = useMutation({
    mutationFn: (d: DraftState) =>
      createFn({
        data: {
          orderId: order.id,
          entry: {
            technician_id: d.technician_id,
            role: d.role.trim() || null,
            work_date: d.work_date,
            start_time: d.start_time,
            end_time: d.end_time,
            hourly_rate_cents: parseBRLToCents(d.rate_input),
            description: "Ajuste manual",
          },
        },
      }),
    onSuccess: () => {
      toast.success("Apontamento adicionado.");
      setCreating(false);
      setNewDraft(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao adicionar."),
  });

  function beginEdit(e: LaborEntry) {
    setEditingId(e.id);
    setDraft(entryToDraft(e));
  }

  function beginCreate() {
    const firstTech = techs[0];
    setNewDraft({
      technician_id: firstTech?.id ?? "",
      role: firstTech?.assignment_role ?? "",
      work_date: new Date().toISOString().slice(0, 10),
      start_time: "08:00",
      end_time: "09:00",
      rate_input:
        firstTech?.hourly_rate_cents != null
          ? (firstTech.hourly_rate_cents / 100).toFixed(2).replace(".", ",")
          : "",
    });
    setCreating(true);
  }

  function validateDraft(d: DraftState): string | null {
    if (!d.technician_id) return "Selecione o técnico.";
    if (!d.work_date) return "Informe a data.";
    try {
      computeDurationMinutes(d.start_time, d.end_time);
    } catch (err) {
      return err instanceof Error ? err.message : "Horário inválido.";
    }
    if (parseBRLToCents(d.rate_input) <= 0) return "Informe R$/h válido.";
    return null;
  }

  function previewSubtotal(d: DraftState): { minutes: number; cents: number } {
    try {
      const minutes = computeDurationMinutes(d.start_time, d.end_time);
      return { minutes, cents: computeSubtotalCents(minutes, parseBRLToCents(d.rate_input)) };
    } catch {
      return { minutes: 0, cents: 0 };
    }
  }

  const canEdit = entries.length === 0 || !entries[0].id.startsWith("derived:");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Edite horários, troque o técnico responsável ou exclua apontamentos. Alterações
          refletem imediatamente no resumo, no PDF e nos relatórios.
        </p>
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={beginCreate}
            disabled={creating || techs.length === 0}
          >
            <Plus size={13} /> Novo apontamento
          </Button>
        )}
      </div>

      {!canEdit && (
        <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
          Estes apontamentos ainda não foram consolidados. Abra o resumo financeiro uma vez
          para habilitar a edição.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="py-1 text-left">Técnico</th>
              <th className="py-1 text-left">Função</th>
              <th className="py-1 text-left">Data</th>
              <th className="py-1 text-left">Entrada</th>
              <th className="py-1 text-left">Saída</th>
              <th className="py-1 text-right">Horas</th>
              <th className="py-1 text-right">R$/h</th>
              <th className="py-1 text-right">Subtotal</th>
              {canEdit && <th className="py-1 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isEditing = editingId === e.id && draft;
              if (isEditing && draft) {
                const err = validateDraft(draft);
                const preview = previewSubtotal(draft);
                return (
                  <tr key={e.id} className="border-t border-white/5 bg-primary/5">
                    <td className="py-1.5">
                      <select
                        value={draft.technician_id}
                        onChange={(ev) =>
                          setDraft({ ...draft, technician_id: ev.target.value })
                        }
                        className="h-8 w-full rounded-md border border-white/10 bg-slate-950/40 px-2 text-xs"
                      >
                        {techs.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name}
                          </option>
                        ))}
                        {/* fallback: técnico atual não vinculado */}
                        {e.technician && !techs.some((t) => t.id === e.technician_id) && (
                          <option value={e.technician_id ?? ""}>
                            {e.technician.full_name}
                          </option>
                        )}
                      </select>
                    </td>
                    <td>
                      <Input
                        value={draft.role}
                        onChange={(ev) => setDraft({ ...draft, role: ev.target.value })}
                        className="h-8 text-xs"
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <Input
                        type="date"
                        value={draft.work_date}
                        onChange={(ev) => setDraft({ ...draft, work_date: ev.target.value })}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td>
                      <Input
                        type="time"
                        value={draft.start_time}
                        onChange={(ev) => setDraft({ ...draft, start_time: ev.target.value })}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td>
                      <Input
                        type="time"
                        value={draft.end_time}
                        onChange={(ev) => setDraft({ ...draft, end_time: ev.target.value })}
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="text-right tabular-nums">{formatHHmm(preview.minutes)}</td>
                    <td>
                      <Input
                        value={draft.rate_input}
                        onChange={(ev) => setDraft({ ...draft, rate_input: ev.target.value })}
                        className="h-8 w-20 text-right text-xs tabular-nums"
                        inputMode="decimal"
                      />
                    </td>
                    <td className="text-right tabular-nums">{formatBRL(preview.cents)}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => {
                            setEditingId(null);
                            setDraft(null);
                          }}
                          disabled={updateMut.isPending}
                        >
                          <X size={13} />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          disabled={!!err || updateMut.isPending}
                          onClick={() => {
                            if (err) {
                              toast.error(err);
                              return;
                            }
                            updateMut.mutate({ entryId: e.id, draft });
                          }}
                        >
                          {updateMut.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                        </Button>
                      </div>
                      {err && (
                        <div className="mt-1 text-[10px] text-rose-300">{err}</div>
                      )}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="py-1.5">{e.technician?.full_name ?? "—"}</td>
                  <td>{e.role ?? "—"}</td>
                  <td>{formatDateBR(e.work_date)}</td>
                  <td>{e.start_time.slice(0, 5)}</td>
                  <td>{e.end_time.slice(0, 5)}</td>
                  <td className="text-right tabular-nums">{formatHHmm(e.duration_minutes)}</td>
                  <td className="text-right tabular-nums">{formatBRL(e.hourly_rate_cents)}</td>
                  <td className="text-right tabular-nums">{formatBRL(e.subtotal_cents)}</td>
                  {canEdit && (
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => beginEdit(e)}
                          disabled={editingId !== null || creating}
                          title="Editar"
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-rose-300 hover:text-rose-200"
                          onClick={() => setConfirmDeleteId(e.id)}
                          disabled={editingId !== null || creating}
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {creating && newDraft && (() => {
              const err = validateDraft(newDraft);
              const preview = previewSubtotal(newDraft);
              return (
                <tr className="border-t border-white/5 bg-emerald-500/5">
                  <td className="py-1.5">
                    <select
                      value={newDraft.technician_id}
                      onChange={(ev) =>
                        setNewDraft({ ...newDraft, technician_id: ev.target.value })
                      }
                      className="h-8 w-full rounded-md border border-white/10 bg-slate-950/40 px-2 text-xs"
                    >
                      {techs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Input
                      value={newDraft.role}
                      onChange={(ev) => setNewDraft({ ...newDraft, role: ev.target.value })}
                      className="h-8 text-xs"
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <Input
                      type="date"
                      value={newDraft.work_date}
                      onChange={(ev) =>
                        setNewDraft({ ...newDraft, work_date: ev.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td>
                    <Input
                      type="time"
                      value={newDraft.start_time}
                      onChange={(ev) =>
                        setNewDraft({ ...newDraft, start_time: ev.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td>
                    <Input
                      type="time"
                      value={newDraft.end_time}
                      onChange={(ev) =>
                        setNewDraft({ ...newDraft, end_time: ev.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="text-right tabular-nums">{formatHHmm(preview.minutes)}</td>
                  <td>
                    <Input
                      value={newDraft.rate_input}
                      onChange={(ev) =>
                        setNewDraft({ ...newDraft, rate_input: ev.target.value })
                      }
                      className="h-8 w-20 text-right text-xs tabular-nums"
                      inputMode="decimal"
                    />
                  </td>
                  <td className="text-right tabular-nums">{formatBRL(preview.cents)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          setCreating(false);
                          setNewDraft(null);
                        }}
                        disabled={createMut.isPending}
                      >
                        <X size={13} />
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        disabled={!!err || createMut.isPending}
                        onClick={() => {
                          if (err) {
                            toast.error(err);
                            return;
                          }
                          createMut.mutate(newDraft);
                        }}
                      >
                        {createMut.isPending ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Check size={13} />
                        )}
                      </Button>
                    </div>
                    {err && <div className="mt-1 text-[10px] text-rose-300">{err}</div>}
                  </td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este apontamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const e = entries.find((x) => x.id === confirmDeleteId);
                if (!e) return "";
                return `${e.technician?.full_name ?? "Técnico"} · ${formatDateBR(
                  e.work_date,
                )} · ${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)} · ${formatBRL(
                  e.subtotal_cents,
                )}. Os totais da OS e do relatório serão recalculados.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={(ev) => {
                ev.preventDefault();
                if (confirmDeleteId) deleteMut.mutate(confirmDeleteId);
              }}
            >
              {deleteMut.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}