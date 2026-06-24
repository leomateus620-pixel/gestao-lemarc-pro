import { Suspense, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { FormFlowActions } from "@/components/app/FormFlowActions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useClientDetailQuery } from "@/hooks/useClients";
import { updateCompany } from "@/lib/api/clients.functions";
import { maskCNPJ, onlyDigits, isValidCNPJ } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ClientFull } from "@/types/client";

export const Route = createFileRoute("/_app/clientes/$id/editar")({
  head: () => ({ meta: [{ title: "Editar cliente — Gestão Lemarc" }] }),
  staticData: { hideBottomNav: true },
  component: EditPage,
});

function EditPage() {
  return (
    <AppShell title="Editar cliente" back fullscreenForm>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <Edit />
      </Suspense>
    </AppShell>
  );
}

const inputCls =
  "h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40";

function Edit() {
  const { id } = Route.useParams();
  const { data } = useClientDetailQuery(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const c = data?.client as ClientFull;

  const [draft, setDraft] = useState({
    name: c.name,
    cnpj: c.cnpj ?? "",
    segment: c.segment ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    responsible_name: c.responsible_name ?? "",
    notes: c.notes ?? "",
    active: c.active,
  });
  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const cnpjOk = !draft.cnpj.trim() || isValidCNPJ(draft.cnpj);
  const valid = draft.name.trim().length >= 2 && cnpjOk;

  const updateFn = useServerFn(updateCompany);
  const mut = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id,
          patch: {
            name: draft.name.trim(),
            cnpj: draft.cnpj ? onlyDigits(draft.cnpj) : null,
            segment: draft.segment || null,
            address: draft.address || null,
            city: draft.city || null,
            state: draft.state || null,
            phone: draft.phone || null,
            email: draft.email || null,
            responsible_name: draft.responsible_name || null,
            notes: draft.notes || null,
            active: draft.active,
          },
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      navigate({ to: "/clientes/$id", params: { id } });
    },
  });

  return (
    <div className="space-y-5">
      <GlassCard className="space-y-5 p-5">
        <div className="space-y-1">
          <Label required>Nome da empresa</Label>
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>CNPJ</Label>
            <Input
              value={maskCNPJ(draft.cnpj)}
              onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
              className={cn(inputCls, !cnpjOk && "border-rose-500/50")}
            />
            {!cnpjOk && <p className="text-[11px] text-rose-300">CNPJ inválido.</p>}
          </div>
          <div className="space-y-1">
            <Label>Segmento</Label>
            <Input
              value={draft.segment}
              onChange={(e) => set("segment", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
          <div className="space-y-1">
            <Label>Cidade</Label>
            <Input value={draft.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <Label>UF</Label>
            <Input
              value={draft.state}
              onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
              className={inputCls}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Endereço</Label>
          <Input
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={draft.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={draft.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Responsável</Label>
          <Input
            value={draft.responsible_name}
            onChange={(e) => set("responsible_name", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="min-h-24 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div>
            <div className="text-sm font-bold text-foreground">Cliente ativo</div>
            <div className="text-[11px] text-muted-foreground">
              Desative para esconder das listagens operacionais.
            </div>
          </div>
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(e) => set("active", e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>
      </GlassCard>

      {mut.isError && (
        <p className="text-sm text-rose-300">{(mut.error as Error).message}</p>
      )}

      <FormFlowActions>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate({ to: "/clientes/$id", params: { id } })}
          className="h-14 rounded-2xl bg-white/[0.07] px-5"
        >
          Cancelar
        </Button>
        <button
          type="button"
          disabled={!valid || mut.isPending}
          onClick={() => mut.mutate()}
          className={cn(
            "lemarc-pressable flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-display text-sm font-black uppercase tracking-wider text-primary-foreground disabled:opacity-40",
            valid && !mut.isPending && "lemarc-orange-glow",
          )}
        >
          <Save size={18} /> {mut.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </FormFlowActions>
    </div>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}