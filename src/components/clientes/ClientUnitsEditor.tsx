import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/app/GlassCard";
import { createClientUnit, deleteClientUnit, updateClientUnit } from "@/lib/api/clients.functions";
import { isValidCNPJ, maskCNPJ, onlyDigits } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientUnit, ClientUnitInput } from "@/types/client";

const inputCls =
  "lemarc-form-control h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/70";

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
    distance_km_from_base: u.distance_km_from_base != null ? String(u.distance_km_from_base) : "",
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
    default_displacement_rate_cents: rate ? Math.round(Number(rate.replace(",", ".")) * 100) : null,
    billing_notes: d.billing_notes || null,
  };
}

function validateDraft(d: UnitDraft): string | null {
  if (!d.name.trim() || d.name.trim().length < 2) return "Informe o nome da unidade.";
  if (d.cnpj && !isValidCNPJ(d.cnpj)) return "CNPJ da unidade inválido.";
  if (d.state && d.state.length !== 2) return "UF deve ter 2 letras.";
  return null;
}

export function ClientUnitsEditor({ clientId, units }: { clientId: string; units: ClientUnit[] }) {
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
            .map((u) => updateFn({ data: { id: u.id, patch: { is_primary: false } } })),
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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao criar unidade"),
  });

  return (
    <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
            Locais de atendimento
          </p>
          <h2 className="mt-1 font-display text-lg font-black leading-tight text-white">
            Unidades e filiais
          </h2>
          <p className="mt-1 max-w-2xl text-[12px] font-medium leading-relaxed text-slate-300">
            Cadastre matriz, filiais, setores, oficinas ou locais operacionais para vincular OS com
            mais precisão.
          </p>
        </div>
        {!creating && (
          <Button
            type="button"
            onClick={() => {
              setCreating(true);
              setNewDraft({ ...emptyDraft(), is_primary: units.length === 0 });
            }}
            className="lemarc-primary-action lemarc-pressable h-10 shrink-0 rounded-full px-4 font-display text-[11px] font-black uppercase tracking-[0.08em]"
          >
            <Plus size={15} /> Adicionar unidade
          </Button>
        )}
      </div>

      {creating && (
        <div className="lemarc-client-unit-card rounded-2xl p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/14 text-primary">
              <Building2 size={16} />
            </span>
            <div>
              <h3 className="font-display text-sm font-black text-white">Nova unidade</h3>
              <p className="text-[12px] font-medium text-slate-400">
                Comece pelo nome e complemente localização, contato e regras de deslocamento.
              </p>
            </div>
          </div>
          <UnitFormFields draft={newDraft} onChange={setNewDraft} />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setNewDraft(emptyDraft());
              }}
              className="lemarc-secondary-action h-11 rounded-xl px-4"
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
              className="lemarc-primary-action lemarc-orange-glow h-11 rounded-xl px-4 font-display text-xs font-black uppercase tracking-wider"
            >
              <Save size={15} /> {createMut.isPending ? "Salvando..." : "Salvar unidade"}
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
          <div className="lemarc-client-empty-state rounded-2xl p-5 text-center sm:p-6">
            <span className="mx-auto grid size-11 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
              <Building2 size={20} />
            </span>
            <h3 className="mt-3 font-display text-base font-black text-white">
              Nenhuma unidade cadastrada
            </h3>
            <p className="mx-auto mt-1.5 max-w-xl text-sm font-medium leading-relaxed text-slate-300">
              Adicione filiais, setores ou locais de atendimento para vincular Ordens de Serviço
              corretamente.
            </p>
            <Button
              type="button"
              onClick={() => {
                setCreating(true);
                setNewDraft({ ...emptyDraft(), is_primary: units.length === 0 });
              }}
              className="lemarc-primary-action lemarc-pressable mt-4 h-10 rounded-full px-4 font-display text-[11px] font-black uppercase tracking-[0.08em]"
            >
              <Plus size={15} /> Adicionar unidade
            </Button>
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
  const location = [unit.city, unit.state].filter(Boolean).join("/");
  const pending = getExistingUnitPendingItems(unit);

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
            .map((u) => updateFn({ data: { id: u.id, patch: { is_primary: false } } })),
        );
      }
      return updated;
    },
    onSuccess: () => {
      toast.success("Unidade atualizada");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar unidade"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFn({ data: { id: unit.id } }),
    onSuccess: () => {
      toast.success("Unidade removida");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover unidade"),
  });

  return (
    <div
      className={cn(
        "lemarc-client-unit-card rounded-2xl transition",
        open && "border-primary/40 bg-white/[0.055]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/12 text-primary">
              <Building2 size={15} />
            </span>
            <span className="min-w-0 truncate font-display text-sm font-black text-white">
              {unit.name}
            </span>
            {unit.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.04em] text-amber-100">
                <Star size={10} /> Principal
              </span>
            )}
            {!unit.active && <PendingBadge>Inativa</PendingBadge>}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400">
            <span className="truncate">{unit.sector || "Setor não informado"}</span>
            <span className="truncate">{location || "Local não informado"}</span>
            {unit.cnpj && <span className="truncate tabular-nums">{maskCNPJ(unit.cnpj)}</span>}
          </div>
          <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
            {pending.length === 0 ? (
              <ReadyBadge>Pronta para OS</ReadyBadge>
            ) : (
              pending.map((item) => <PendingBadge key={item}>{item}</PendingBadge>)
            )}
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

          <label className="lemarc-client-active-toggle mt-4 flex cursor-pointer items-center justify-between rounded-xl p-3">
            <div>
              <div className="text-sm font-bold text-white">Unidade ativa</div>
              <div className="text-[11px] text-slate-400">
                Desative para esconder das operações.
              </div>
            </div>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
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
              className="lemarc-primary-action lemarc-orange-glow h-11 rounded-xl px-4 font-display text-xs font-black uppercase tracking-wider"
            >
              <Save size={15} /> {saveMut.isPending ? "Salvando..." : "Salvar unidade"}
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
          {!cnpjOk && <p className="text-[11px] text-rose-300">CNPJ inválido.</p>}
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
            onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
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

      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <FieldLabel>Deslocamento padrão</FieldLabel>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-start">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              Distância da base (km)
            </label>
            <Input
              inputMode="decimal"
              value={draft.distance_km_from_base}
              onChange={(e) => set("distance_km_from_base", e.target.value.replace(/[^\d.,]/g, ""))}
              className={inputCls}
              placeholder="Não definida"
            />
          </div>
          <p className="text-[11px] font-medium leading-snug text-slate-400 sm:pt-6">
            O valor por km é configurado globalmente nas configurações do sistema.
          </p>
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

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="lemarc-form-label text-[10px] font-black uppercase tracking-[0.08em]">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function PendingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.04em] text-amber-100">
      <AlertTriangle size={10} />
      {children}
    </span>
  );
}

function ReadyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.04em] text-emerald-100">
      <CheckCircle2 size={10} />
      {children}
    </span>
  );
}

function getExistingUnitPendingItems(unit: ClientUnit) {
  const items: string[] = [];
  if (!unit.sector?.trim()) items.push("Setor pendente");
  if (!unit.city?.trim() || !unit.state?.trim()) items.push("Local pendente");
  if (!unit.cnpj?.trim()) items.push("CNPJ opcional");
  return items.slice(0, 3);
}
