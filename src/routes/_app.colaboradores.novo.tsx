import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { CollaboratorForm } from "@/components/colaboradores/CollaboratorForm";
import { createTechnician, type TechnicianInput } from "@/lib/api/serviceOrders.functions";
import type { TechnicianLite } from "@/types/serviceOrder";

export const Route = createFileRoute("/_app/colaboradores/novo")({
  head: () => ({ meta: [{ title: "Novo colaborador — Gestão Lemarc" }] }),
  component: NovoColaboradorPage,
});

function NovoColaboradorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createTechnician);

  const mutation = useMutation({
    mutationFn: (data: TechnicianInput) => createFn({ data }),
    onSuccess: (row) => {
      if (!row?.id) {
        toast.error("Cadastro retornou sem ID. Tente novamente.");
        return;
      }
      // Seed cache imediatamente para evitar 404 ao navegar enquanto a query
      // ainda está fresca (staleTime de 60s em useTechniciansQuery).
      queryClient.setQueryData<TechnicianLite[]>(["technicians"], (prev) => {
        const list = prev ?? [];
        if (list.some((t) => t.id === row.id)) return list;
        return [...list, row].sort((a, b) => a.full_name.localeCompare(b.full_name));
      });
      queryClient.invalidateQueries({ queryKey: ["technicians"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      toast.success("Colaborador cadastrado");
      navigate({ to: "/colaboradores/$id", params: { id: row.id } });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Falha ao cadastrar colaborador"),
  });

  return (
    <AppShell title="Novo colaborador" back fullscreenForm>
      <CollaboratorForm
        submitLabel="Cadastrar colaborador"
        loading={mutation.isPending}
        onSubmit={(data) => mutation.mutate(data)}
      />
    </AppShell>
  );
}
