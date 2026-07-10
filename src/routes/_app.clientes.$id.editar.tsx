import { Suspense, useState, type ReactNode } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Route as RouteIcon,
  Save,
} from "lucide-react";
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
import { ClientUnitsEditor } from "@/components/clientes/ClientUnitsEditor";

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

const inputCls = "h-12 rounded-xl border-white/10 bg-white/[0.07] focus-visible:ring-primary/40";

function Edit() {
  const { id } = Route.useParams();
  const { data } = useClientDetailQuery(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const c = data?.client as ClientFull;
  const units = data?.units ?? [];
  const needsDistance =
    units.length === 0 ||
    units.some((u) => u.distance_km_from_base == null || Number(u.distance_km_from_base) <= 0);
  const scrollToUnits = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("client-units-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      qc.invalidateQueries({ queryKey: ["client-page", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente atualizado");
      navigate({ to: "/clientes/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar cliente"),
  });

  return (
    <div className="space-y-5 pb-28 md:pb-0">
      <GlassCard className="lemarc-wizard-card space-y-4 p-4 sm:space-y-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="lemarc-context-label">Cadastro do cliente</p>
            <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              Editar cliente
            </h1>
            <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-300">
              Atualize apenas o que mudou. As unidades continuam em uma seção própria para manter OS
              e histórico vinculados corretamente.
            </p>
            {needsDistance && (
              <button
                type="button"
                onClick={scrollToUnits}
                className="lemarc-pressable mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/15"
              >
                <RouteIcon size={13} /> Configurar distância da base
              </button>
            )}
          </div>
          <label className="lemarc-client-active-toggle flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-3 lg:min-w-[18rem]">
            <span>
              <span className="block text-sm font-black text-white">Cliente ativo</span>
              <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
                Controla exibição nas listagens operacionais.
              </span>
            </span>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </div>

        <FormSection
          icon={Building2}
          title="Identificação da empresa"
          description="Dados usados para busca, conferência e vínculo com ordens de serviço."
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.78fr)_minmax(12rem,0.82fr)]">
            <FormField label="Nome da empresa" required>
              <Input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
              />
            </FormField>
            <FormField label="CNPJ" help="Opcional, mas recomendado para evitar duplicidade.">
              <Input
                value={maskCNPJ(draft.cnpj)}
                onChange={(e) => set("cnpj", onlyDigits(e.target.value))}
                placeholder="00.000.000/0000-00"
                className={cn(inputCls, !cnpjOk && "border-rose-500/50")}
              />
              {!cnpjOk && (
                <p className="rounded-lg border border-rose-300/35 bg-rose-500/12 px-3 py-2 text-[11px] font-bold text-rose-100">
                  CNPJ inválido. Verifique os dígitos antes de salvar.
                </p>
              )}
            </FormField>
            <FormField label="Segmento">
              <Input
                value={draft.segment}
                onChange={(e) => set("segment", e.target.value)}
                placeholder="Ex.: Manutenção industrial"
                className={inputCls}
              />
            </FormField>
          </div>
        </FormSection>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          <FormSection
            icon={MapPin}
            title="Localização"
            description="Base principal do cliente. Unidades específicas ficam abaixo."
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <FormField label="Cidade">
                <Input
                  value={draft.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputCls}
                />
              </FormField>
              <FormField label="UF">
                <Input
                  value={draft.state}
                  onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  className={inputCls}
                />
              </FormField>
            </div>
            <FormField label="Endereço" className="mt-3">
              <Input
                value={draft.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputCls}
              />
            </FormField>
          </FormSection>

          <FormSection
            icon={Phone}
            title="Contato"
            description="Referência para alinhamento operacional, agenda e cobrança."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <FormField label="Telefone">
                <Input
                  value={draft.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputCls}
                />
              </FormField>
              <FormField label="E-mail">
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputCls}
                />
              </FormField>
              <FormField label="Responsável" className="sm:col-span-2 xl:col-span-1">
                <Input
                  value={draft.responsible_name}
                  onChange={(e) => set("responsible_name", e.target.value)}
                  className={inputCls}
                />
              </FormField>
            </div>
          </FormSection>
        </div>

        <FormSection
          icon={FileText}
          title="Observações internas"
          description="Informações que ajudam atendimento, acesso, cobrança ou relacionamento."
        >
          <FormField label="Notas">
            <Textarea
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Ex.: regras de acesso, horário preferencial, observações de cobrança..."
              className="lemarc-form-control min-h-24 rounded-xl focus-visible:ring-primary/40"
            />
          </FormField>
        </FormSection>
      </GlassCard>

      <div id="client-units-section" className="scroll-mt-24">
        <ClientUnitsEditor clientId={id} units={units} />
      </div>

      {mut.isError && (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/12 px-4 py-3 text-sm font-semibold text-rose-100">
          {(mut.error as Error).message}
        </div>
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
            "lemarc-primary-action lemarc-pressable flex h-14 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-display text-sm font-bold disabled:opacity-40",
            valid && !mut.isPending && "lemarc-orange-glow",
          )}
        >
          {mut.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {mut.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </FormFlowActions>
    </div>
  );
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="lemarc-form-label text-xs font-semibold">
      {children}
      {required && <span className="ml-1 text-primary">*</span>}
    </label>
  );
}

function FormField({
  label,
  required,
  help,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label required={required}>{label}</Label>
      {children}
      {help && <p className="text-[11px] font-semibold leading-snug text-slate-400">{help}</p>}
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: typeof Building2;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("lemarc-client-form-section rounded-2xl p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/14 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-black leading-tight text-white sm:text-base">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12px] font-medium leading-snug text-slate-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
