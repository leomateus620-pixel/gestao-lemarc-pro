import { Suspense } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CollaboratorForm } from "@/components/colaboradores/CollaboratorForm";
import { useTechniciansQuery } from "@/hooks/useServiceOrders";
import {
  updateTechnician,
  type TechnicianInput,
  type TechnicianUpdateInput,
} from "@/lib/api/serviceOrders.functions";

export const Route = createFileRoute("/_app/colaboradores/$id/editar")({
  head: () => ({ meta: [{ title: "Editar colaborador — Gestão Lemarc" }] }),
  component: EditarColaboradorPage,
});

function EditarColaboradorPage() {
  return (
    <AppShell title="Editar colaborador" back fullscreenForm>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-white/[0.06]" />}>
        <EditarContent />
      </Suspense>
    </AppShell>
  );
}

function EditarContent() {
  const { id } = Route.useParams();
  const { data: technicians } = useTechniciansQuery();
  const technician = technicians.find((item) => item.id === id);
  if (!technician) throw notFound();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateTechnician);

  const mutation = useMutation({
    mutationFn: (data: TechnicianUpdateInput) => updateFn({ data }),
    onSuccess: () => {
      toast.success("Colaborador atualizado");
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["technician-labor-history"] });
      queryClient.invalidateQueries({ queryKey: ["report-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-financials"] });
      navigate({ to: "/colaboradores/$id", params: { id } });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao salvar colaborador"),
  });

  function handleSubmit(data: TechnicianInput) {
    mutation.mutate({ ...data, id });
  }

  return (
    <CollaboratorForm
      initial={technician}
      submitLabel="Salvar alterações"
      loading={mutation.isPending}
      onSubmit={handleSubmit}
    />
  );
}
