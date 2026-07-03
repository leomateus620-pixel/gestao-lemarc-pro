import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, Plus, Save, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/GlassCard";
import {
  createClientUnit,
  deleteClientUnit,
  updateClientUnit,
} from "@/lib/api/clients.functions";
import { isValidCNPJ, maskCNPJ, onlyDigits } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientUnit, ClientUnitInput } from "@/types/client";

const inputCls =
  "h-11 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40";

type DisplacementType = "km" | "fixed" | "none";

type UnitDraft = {
  name: string;
  cnpj: string;
  sector: string;
  city: string;
  state: string;
  address: string;
  responsible_name: string;
  phone: string;
  distance_km_from_base: string;
  default_displacement_type: DisplacementType | "";
  default_displacement_rate_reais: string;
  billing_notes: string;
  notes: string;
  is_primary: boolean;
  active: boolean;
};

function unitToDraft(u: ClientUnit): UnitDraft {
  return {
    name: u.name,
    cnpj: u.cnpj ?? "",
    sector: u.sector ?? "",
    city: u.city ?? "",
    state: u.state ?? "",
    address: u.address ?? "",
    responsible_name: u.responsible_name ?? "",
    phone: u.phone ?? "",
    distance_km_from_base:
      u.distance_km_from_base != null ? String(u.distance_km_from_base) : "",
    default_displacement_type: u.default_displacement_type ?? "",
    default_displacement_rate_reais:
      u.default_displacement_rate_cents != null
        ? (u.default_displacement_rate_cents / 100).toFixed(2)
        : "",
    billing_notes: u.billing_notes ?? "",
    notes: u.notes ?? "",
    is_primary: u.is_primary,
    active: u.active,
  };
}

function emptyDraft(): UnitDraft {
  return {
    name: "",
    cnpj: "",
    sector: "",
    city: "",
    state: "",
    address: "",
    responsible_name: "",
    phone: "",
    distance_km_from_base: "",
    default_displacement_type: "",
    default_displacement_rate_reais: "",
    billing_notes: "",
    notes: "",
    is_primary: false,
    active: true,
  };
}

function draftToInput(d: UnitDraft): ClientUnitInput {
  const rate = d.default_displacement_rate_reais.trim();
  return {
    name: d.name.trim(),
    cnpj: d.cnpj ? onlyDigits(d.cnpj) : null,
    sector: d.sector || null,
    city: d.city || null,
    state: d.state || null,
    address: d.address || null,
    responsible_name: d.responsible_name || null,
    phone: d.phone || null,
    notes: d.notes || null,
    is_primary: d.is_primary,
    distance_km_from_base: d.distance_km_from_base
      ? Number(d.distance_km_from_base.replace(",", "."))
      : null,
    default_displacement_type: d.default_displacement_type || null,
    default_displacement_rate_cents: rate
      ? Math.round(Number(rate.replace(",", ".")) * 100)
      : null,
    billing_notes: d.billing_notes || null,
  };
}

function validateDraft(d: UnitDraft): string | null {
  if (!d.name.trim() || d.name.trim().length < 2)
    return "Informe o nome da unidade.";
  if (d.cnpj && !isValidCNPJ(d.cnpj)) return "CNPJ da unidade inválido.";
  if (d.state && d.state.length !== 2) return "UF deve ter 2 letras.";
  return null;
}

export function ClientUnitsEditor({
  clientId,
  units,
}: {
  clientId: string;
  units: ClientUnit[];
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<UnitDraft>(emptyDraft);

  const createFn = useServerFn(createClientUnit);
  const updateFn = useServerFn(updateClientUnit);
  const deleteFn = useServerFn(deleteClientUnit);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client", clientId] });
    qc.invalidateQueries({ queryKey: ["client-page", clientId] });
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client-units", "all"] });
  };

  const createMut = useMutation({
    mutationFn: async (d: UnitDraft) => {
      const input = draftToInput(d);
      const created = await createFn({ data: { client_id: clientId, ...input } });
      if (d.is_primary) {
        await Promise.all(
          units
            .filter((u) => u.is_primary && u.id !== created.id)
            .map((u) =>
              updateFn({ data: { id: u.id, patch: { is_primary: false } } }),
            ),
        );
      }
      return created;
    },
    onSuccess: () => {
      toast.success("Unidade adicionada");
      setCreating(false);
      setNewDraft(emptyDraft());
      invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Falha ao criar unidade"),
  });

  return (
    <GlassCard className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-black uppercase tracking-[0.14em] text-foreground">
            Unidades / Filiais
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {units.length === 0
              ? "Nenhuma unidade cadastrada."
              : `${units.length} unidade${units.length > 1 ? "s" : ""} cadastrada${units.length > 1 ? "s" : ""}.`}
          </p>
        </div>
        {!creating && (
          <Button
            type="button"
            onClick={() => {
              setCreating(true);
              setNewDraft({ ...emptyDraft(), is_primary: units.length === 0 });
            }}
            className="h-10 rounded-xl bg-primary px-3 font-display text-xs font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/95"
          >
            <Plus size={16} /> Adicionar
          </Button>
        )}
      </div>

      {creating && (
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
          <UnitFormFields draft={newDraft} onChange={setNewDraft} />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setNewDraft(emptyDraft());
              }}
              className="h-11 rounded-xl bg-white/[0.07] px-4"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createMut.isPending}
              onClick={() => {
                const err = validateDraft(newDraft);
                if (err) {
                  toast.error(err);
                  return;
                }
                createMut.mutate(newDraft);
              }}
              className="lemarc-orange-glow h-11 rounded-xl bg-primary px-4 font-display text-xs font-black uppercase tracking-wider text-primary-foreground"
            >
              <Save size={15} />{" "}
              {createMut.isPending ? "Salvando..." : "Salvar unidade"}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {units.map((u) => (
          <UnitRow
            key={u.id}
            unit={u}
            allUnits={units}
            clientId={clientId}
            open={expanded === u.id}
            onToggle={() => setExpanded(expanded === u.id ? null : u.id)}
            onChanged={invalidate}
            updateFn={updateFn}
            deleteFn={deleteFn}
          />
        ))}
        {units.length === 0 && !creating && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-center text-[12px] text-muted-foreground">
            Nenhuma unidade cadastrada. Clique em "Adicionar" para cadastrar a
            primeira.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function UnitRow({
  unit,
  allUnits,
  clientId: _clientId,
  open,
  onToggle,
  onChanged,
  updateFn,
  deleteFn,
}: {
  unit: ClientUnit;
  allUnits: ClientUnit[];
  clientId: string;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  updateFn: ReturnType<typeof useServerFn<typeof updateClientUnit>>;
  deleteFn: ReturnType<typeof useServerFn<typeof deleteClientUnit>>;
}) {
  const [draft, setDraft] = useState<UnitDraft>(() => unitToDraft(unit));

  const saveMut = useMutation({
    mutationFn: async (d: UnitDraft) => {
      const patch = draftToInput(d);
      const updated = await updateFn({
        data: {
          id: unit.id,
          patch: { ...patch, active: d.active },
        },
      });
      if (d.is_primary && !unit.is_primary) {
        await Promise.all(
          allUnits
            .filter((u) => u.is_primary && u.id !== unit.id)
            .map((u) =>
              updateFn({ data: { id: u.id, patch: { is_primary: false } } }),
            ),
        );
      }
      return updated;
    },
    onSuccess: () => {
      toast.success("Unidade atualizada");
      onChanged();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Falha ao salvar unidade"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: unit.id } }),
    onSuccess: () => {
      toast.success("Unidade removida");
      onChanged();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Falha ao remover unidade"),
  });

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.03] transition",
        open && "border-primary/40 bg-white/[0.05]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {unit.is_primary && (
              <Star size={13} className="fill-amber-300 text-amber-300" />
            )}
            <span className="truncate text-sm font-bold text-foreground">
              {unit.name}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {[unit.city, unit.state].filter(Boolean).join("/") || "Sem cidade"}
            {unit.cnpj ? ` · ${maskCNPJ(unit.cnpj)}` : ""}
            {!unit.active ? " · Inativa" : ""}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn("text-muted-foreground transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t border-white/10 p-4">
          <UnitFormFields draft={draft} onChange={setDraft} />

          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <div className="text-sm font-bold text-foreground">
                Unidade ativa
              </div>
              <div className="text-[11px] text-muted-foreground">
                Desative para esconder das operações.
              </div>
            </div>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) =>
                setDraft((d) => ({ ...d, active: e.target.checked }))
              }
              className="h-5 w-5 accent-primary"
            />
          </label>

          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Remover a unidade "${unit.name}"? Esta ação não pode ser desfeita.`,
                  )
                ) {
                  deleteMut.mutate();
                }
              }}
              className="h-11 rounded-xl bg-rose-500/15 px-4 text-rose-200 hover:bg-rose-500/25"
            >
              <Trash2 size={15} /> Remover
            </Button>
            <Button
              type="button"
              disabled={saveMut.isPending}
              onClick={() => {
                const err = validateDraft(draft);
                if (err) {
                  toast.error(err);
                  return;
                }
                saveMut.mutate(draft);
              }}
              className="lemarc-orange-glow h-11 rounded-xl bg-primary px-4 font-display text-xs font-black uppercase tracking-wider text-primary-foreground"
            >
              <Save size={15} />{" "}
              {saveMut.isPending ? "Salvando..." : "Salvar unidade"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitFormFields({
  draft,
  onChange,
}: {
  draft: UnitDraft;
  onChange: (updater: (d: UnitDraft) => UnitDraft) => void;
}) {
  const set = <K extends keyof UnitDraft>(k: K, v: UnitDraft[K]) =>
    onChange((d) => ({ ...d, [k]: v }));
  const cnpjOk = !draft.cnpj.trim() || isValidCNPJ(draft.cnpj);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <FieldLabel required>Nome da unidade</FieldLabel>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
            placeholder="Ex: Matriz, Filial Norte"
          />
        </div>
        <label className="flex cursor-pointer items-end gap-2 pb-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
          <input
            type="checkbox"
            checked={draft.is_primary}
            onChange={(e) => set("is_primary", e.target.checked)}
            className="h-4 w-4 accent-amber-400"
          />
          Principal
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>CNPJ da unidade</FieldLabel>
          <Input
            value={maskCNPJ(draft.cnpj)}
            onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
            className={cn(inputCls, !cnpjOk && "border-rose-500/50")}
            placeholder="00.000.000/0000-00"
          />
          {!cnpjOk && (
            <p className="text-[11px] text-rose-300">CNPJ inválido.</p>
          )}
        </div>
        <div className="space-y-1">
          <FieldLabel>Setor</FieldLabel>
          <Input
            value={draft.sector}
            onChange={(e) => set("sector", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div className="space-y-1">
          <FieldLabel>Cidade</FieldLabel>
          <Input
            value={draft.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>UF</FieldLabel>
          <Input
            value={draft.state}
            onChange={(e) =>
              set("state", e.target.value.toUpperCase().slice(0, 2))
            }
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel>Endereço</FieldLabel>
        <Input
          value={draft.address}
          onChange={(e) => set("address", e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>Responsável</FieldLabel>
          <Input
            value={draft.responsible_name}
            onChange={(e) => set("responsible_name", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Telefone</FieldLabel>
          <Input
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <FieldLabel>Distância (km)</FieldLabel>
          <Input
            inputMode="decimal"
            value={draft.distance_km_from_base}
            onChange={(e) =>
              set(
                "distance_km_from_base",
                e.target.value.replace(/[^\d.,]/g, ""),
              )
            }
            className={inputCls}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Tipo deslocamento</FieldLabel>
          <select
            value={draft.default_displacement_type}
            onChange={(e) =>
              set(
                "default_displacement_type",
                e.target.value as DisplacementType | "",
              )
            }
            className={cn(inputCls, "w-full px-3")}
          >
            <option value="">—</option>
            <option value="km">Por km</option>
            <option value="fixed">Valor fixo</option>
            <option value="none">Sem cobrança</option>
          </select>
        </div>
        <div className="space-y-1">
          <FieldLabel>Valor (R$)</FieldLabel>
          <Input
            inputMode="decimal"
            value={draft.default_displacement_rate_reais}
            onChange={(e) =>
              set(
                "default_displacement_rate_reais",
                e.target.value.replace(/[^\d.,]/g, ""),
              )
            }
            className={inputCls}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel>Observações de faturamento</FieldLabel>
        <Textarea
          value={draft.billing_notes}
          onChange={(e) => set("billing_notes", e.target.value)}
          className="min-h-20 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
        />
      </div>

      <div className="space-y-1">
        <FieldLabel>Observações gerais</FieldLabel>
        <Textarea
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="min-h-20 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
        />
      </div>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}