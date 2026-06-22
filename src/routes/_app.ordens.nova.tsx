import { Suspense, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { PrimaryCTA } from "@/components/app/operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClientsQuery, useTechniciansQuery } from "@/hooks/useServiceOrders";
import {
  createClient as createClientFn,
  createServiceOrder,
  createTechnician,
} from "@/lib/api/serviceOrders.functions";
import {
  priorityLabel,
  serviceTypeLabel,
  type ServicePriority,
  type ServiceType,
} from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/ordens/nova")({
  head: () => ({ meta: [{ title: "Nova OS — Gestão Lemarc" }] }),
  component: NovaOSPage,
});

const serviceTypes = Object.entries(serviceTypeLabel) as [ServiceType, string][];
const priorities = Object.entries(priorityLabel) as [ServicePriority, string][];

function NovaOSPage() {
  return (
    <AppShell title="Nova ordem de serviço" back>
      <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/5" />}>
        <NovaOS />
      </Suspense>
    </AppShell>
  );
}

function NovaOS() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: clients } = useClientsQuery();
  const { data: technicians } = useTechniciansQuery();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [techId, setTechId] = useState<string>("");
  const [type, setType] = useState<ServiceType>("mecanica");
  const [prio, setPrio] = useState<ServicePriority>("media");
  const [location, setLocation] = useState("");
  const [scheduled, setScheduled] = useState("");

  const [newClient, setNewClient] = useState("");
  const [newClientUnit, setNewClientUnit] = useState("");
  const [newTech, setNewTech] = useState("");
  const [newTechRole, setNewTechRole] = useState("");

  const createOrder = useServerFn(createServiceOrder);
  const createCli = useServerFn(createClientFn);
  const createTec = useServerFn(createTechnician);

  const clientMutation = useMutation({
    mutationFn: () => createCli({ data: { name: newClient, unit: newClientUnit || null } }),
    onSuccess: (row) => {
      setClientId(row.id);
      setNewClient("");
      setNewClientUnit("");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const techMutation = useMutation({
    mutationFn: () => createTec({ data: { full_name: newTech, role: newTechRole || null } }),
    onSuccess: (row) => {
      setTechId(row.id);
      setNewTech("");
      setNewTechRole("");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      createOrder({
        data: {
          title,
          description: desc || null,
          client_id: clientId || null,
          technician_id: techId || null,
          service_type: type,
          priority: prio,
          location: location || null,
          scheduled_for: scheduled ? new Date(scheduled).toISOString() : null,
        },
      }),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      navigate({ to: "/ordens/$id", params: { id: row.id } });
    },
  });

  const canSubmit = title.trim().length >= 3 && !orderMutation.isPending;

  return (
    <div className="mt-2 space-y-4">
      <GlassCard className="space-y-4 p-5">
        <Field label="Título do serviço *">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Manutenção do compressor"
            className="h-12 border-border bg-secondary/60"
          />
        </Field>
        <Field label="Descrição inicial">
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Sintoma, escopo, ferramentas, EPI..."
            className="min-h-28 border-border bg-secondary/60"
          />
        </Field>
        <Field label="Local / setor">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex.: Casa de máquinas"
            className="h-12 border-border bg-secondary/60"
          />
        </Field>
        <Field label="Previsão (data e hora)">
          <Input
            type="datetime-local"
            value={scheduled}
            onChange={(e) => setScheduled(e.target.value)}
            className="h-12 border-border bg-secondary/60"
          />
        </Field>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <p className="section-title">Cliente</p>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-secondary/60 px-3 text-sm text-foreground"
        >
          <option value="">— Selecione um cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.unit ? ` · ${c.unit}` : ""}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-white/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Ou cadastre rapidamente
          </p>
          <Input
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Nome do cliente"
            className="h-11 border-border bg-secondary/60"
          />
          <Input
            value={newClientUnit}
            onChange={(e) => setNewClientUnit(e.target.value)}
            placeholder="Unidade (opcional)"
            className="h-11 border-border bg-secondary/60"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!newClient.trim() || clientMutation.isPending}
            onClick={() => clientMutation.mutate()}
            className="h-10 gap-2 bg-secondary text-foreground"
          >
            <Plus size={14} /> {clientMutation.isPending ? "Salvando..." : "Adicionar cliente"}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <p className="section-title">Técnico responsável</p>
        <select
          value={techId}
          onChange={(e) => setTechId(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-secondary/60 px-3 text-sm text-foreground"
        >
          <option value="">— Sem técnico definido —</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name}
              {t.role ? ` · ${t.role}` : ""}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-white/10 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
            Cadastrar técnico
          </p>
          <Input
            value={newTech}
            onChange={(e) => setNewTech(e.target.value)}
            placeholder="Nome do técnico"
            className="h-11 border-border bg-secondary/60"
          />
          <Input
            value={newTechRole}
            onChange={(e) => setNewTechRole(e.target.value)}
            placeholder="Função (opcional)"
            className="h-11 border-border bg-secondary/60"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!newTech.trim() || techMutation.isPending}
            onClick={() => techMutation.mutate()}
            className="h-10 gap-2 bg-secondary text-foreground"
          >
            <Plus size={14} /> {techMutation.isPending ? "Salvando..." : "Adicionar técnico"}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="space-y-4 p-5">
        <Field label="Tipo de serviço">
          <div className="grid gap-2">
            {serviceTypes.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                  type === key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-secondary/50 text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Prioridade">
          <div className="grid grid-cols-4 gap-2">
            {priorities.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPrio(key)}
                className={`rounded-xl border px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] ${
                  prio === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/50 text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      </GlassCard>

      {orderMutation.isError && (
        <p className="text-sm text-rose-300">
          Não foi possível criar a OS: {(orderMutation.error as Error).message}
        </p>
      )}

      <div className="sticky bottom-24 z-20 pb-2">
        <PrimaryCTA
          onClick={() => orderMutation.mutate()}
          icon={ClipboardCheck}
          disabled={!canSubmit}
        >
          {orderMutation.isPending ? "Criando OS..." : "Criar ordem de serviço"}
        </PrimaryCTA>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
