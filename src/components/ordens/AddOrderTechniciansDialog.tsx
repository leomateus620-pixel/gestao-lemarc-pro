import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addServiceOrderTechnicians, listTechnicians } from "@/lib/api/serviceOrders.functions";
import type { TechnicianLite } from "@/types/serviceOrder";

export function AddOrderTechniciansDialog({
  orderId,
  assignedTechnicianIds,
}: {
  orderId: string;
  assignedTechnicianIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTechnicians);
  const addFn = useServerFn(addServiceOrderTechnicians);

  const techniciansQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => listFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const technicians = (techniciansQuery.data ?? []) as TechnicianLite[];
  const assigned = useMemo(() => new Set(assignedTechnicianIds), [assignedTechnicianIds]);
  const available = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return technicians
      .filter((technician) => technician.active !== false && !assigned.has(technician.id))
      .filter(
        (technician) =>
          !normalizedQuery ||
          technician.full_name.toLocaleLowerCase().includes(normalizedQuery) ||
          (technician.role ?? "").toLocaleLowerCase().includes(normalizedQuery),
      );
  }, [assigned, query, technicians]);

  const mutation = useMutation({
    mutationFn: () => addFn({ data: { orderId, technicianIds: selected } }),
    onSuccess: (result: { addedCount: number }) => {
      toast.success(
        result.addedCount === 1
          ? "Técnico adicionado à OS."
          : `${result.addedCount} técnicos adicionados à OS.`,
      );
      queryClient.invalidateQueries({ queryKey: ["service-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-time-sessions", orderId] });
      setSelected([]);
      setQuery("");
      setOpen(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível adicionar os técnicos."),
  });

  function toggleTechnician(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSelected([]);
          setQuery("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" className="mt-2 gap-2 rounded-xl">
          <Plus size={14} /> Adicionar técnico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-hidden sm:max-h-[calc(100dvh-2rem)]">
        <DialogHeader>
          <DialogTitle>Adicionar técnico à OS</DialogTitle>
          <DialogDescription>
            O novo técnico entra com cronômetro zerado e inicia o tempo somente quando começar a
            trabalhar.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-3 overflow-y-auto">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar técnico…"
              className="pl-9"
              autoFocus
            />
          </div>

          {techniciansQuery.isPending ? (
            <div className="flex min-h-28 items-center justify-center text-sm text-muted-foreground">
              <Loader2 size={16} className="mr-2 animate-spin" /> Carregando técnicos…
            </div>
          ) : techniciansQuery.isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Não foi possível carregar os técnicos.
            </p>
          ) : available.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum técnico ativo disponível para adicionar.
            </p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {available.map((technician) => {
                const isSelected = selected.includes(technician.id);
                return (
                  <button
                    key={technician.id}
                    type="button"
                    onClick={() => toggleTechnician(technician.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      isSelected
                        ? "border-primary/50 bg-primary/10"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {technician.full_name}
                      </span>
                      {technician.role && (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {technician.role}
                        </span>
                      )}
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent"
                      }`}
                    >
                      <Check size={12} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={selected.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            {mutation.isPending ? "Adicionando…" : "Adicionar selecionados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
