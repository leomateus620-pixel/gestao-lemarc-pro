import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listAllUnits, listClientsFull } from "@/lib/api/clients.functions";
import { updateServiceOrderClientUnit } from "@/lib/api/serviceOrders.functions";
import { maskCNPJ } from "@/lib/cnpj";
import { cn } from "@/lib/utils";
import type { ServiceOrder } from "@/types/serviceOrder";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function EditClientUnitDialog({ order }: { order: ServiceOrder }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(order.client_id ?? null);
  const [unitId, setUnitId] = useState<string | null>(order.client_unit_id ?? null);
  const [clientQuery, setClientQuery] = useState("");
  const [unitQuery, setUnitQuery] = useState("");

  const clientsFetcher = useServerFn(listClientsFull);
  const unitsFetcher = useServerFn(listAllUnits);
  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "full"],
    queryFn: () => clientsFetcher(),
    enabled: open,
    staleTime: 30_000,
  });
  const { data: units = [] } = useQuery({
    queryKey: ["client-units", "all"],
    queryFn: () => unitsFetcher(),
    enabled: open,
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();
  const save = useServerFn(updateServiceOrderClientUnit);
  const mutation = useMutation({
    mutationFn: () =>
      save({ data: { id: order.id, client_id: clientId, client_unit_id: unitId } }),
    onSuccess: () => {
      toast.success("Cliente/unidade atualizados");
      for (const key of [
        ["service-orders"],
        ["service-order", order.id],
        ["report-orders"],
        ["order-financials", order.id],
        ["client-page"],
        ["operational-dashboard"],
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const filteredClients = useMemo(() => {
    const q = normalizeText(clientQuery.trim());
    const list = clients.filter((c) => c.active !== false || c.id === clientId);
    if (!q) return list.slice(0, 60);
    return list
      .filter((c) =>
        [c.name, c.cnpj, c.city, c.state].some((v) => v && normalizeText(String(v)).includes(q)),
      )
      .slice(0, 60);
  }, [clientId, clientQuery, clients]);

  const clientUnits = useMemo(
    () => units.filter((u) => u.client_id === clientId && (u.active !== false || u.id === unitId)),
    [clientId, unitId, units],
  );

  const filteredUnits = useMemo(() => {
    const q = normalizeText(unitQuery.trim());
    if (!q) return clientUnits.slice(0, 60);
    return clientUnits
      .filter((u) =>
        [u.name, u.address, u.city, u.state, u.cnpj, u.sector].some(
          (v) => v && normalizeText(String(v)).includes(q),
        ),
      )
      .slice(0, 60);
  }, [clientUnits, unitQuery]);

  const currentUnit = units.find((u) => u.id === unitId) ?? null;
  const changed = clientId !== (order.client_id ?? null) || unitId !== (order.client_unit_id ?? null);
  const displacementChanged =
    currentUnit != null &&
    (currentUnit.default_displacement_type !==
      (order.client_unit?.default_displacement_type ?? null) ||
      Number(currentUnit.distance_km_from_base ?? 0) !==
        Number(order.client_unit?.distance_km_from_base ?? 0));

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setClientId(order.client_id ?? null);
          setUnitId(order.client_unit_id ?? null);
          setClientQuery("");
          setUnitQuery("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="mt-2 h-8 gap-1.5 rounded-xl text-xs">
          <Pencil size={13} /> Editar cliente/unidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cliente e unidade da OS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Empresa
            </p>
            <Input
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              placeholder="Buscar empresa por nome, CNPJ ou cidade"
            />
            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClientId(c.id);
                    if (units.find((u) => u.id === unitId)?.client_id !== c.id) setUnitId(null);
                  }}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    clientId === c.id
                      ? "border-primary/60 bg-primary/15 font-bold"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="block truncate">{c.name}</span>
                  {c.cnpj && (
                    <span className="block text-[11px] text-muted-foreground">
                      CNPJ {maskCNPJ(c.cnpj)}
                    </span>
                  )}
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground">Nenhuma empresa encontrada.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Unidade
            </p>
            <Input
              value={unitQuery}
              onChange={(e) => setUnitQuery(e.target.value)}
              placeholder="Buscar unidade por nome, endereço, cidade/UF ou CNPJ"
              disabled={!clientId}
            />
            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setUnitId(null)}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                  unitId === null
                    ? "border-primary/60 bg-primary/15 font-bold"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                Sem unidade específica
              </button>
              {filteredUnits.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnitId(u.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    unitId === u.id
                      ? "border-primary/60 bg-primary/15 font-bold"
                      : "border-border/60 hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 size={12} className="shrink-0 text-primary" />
                    <span className="truncate">{u.name}</span>
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {[u.address, [u.city, u.state].filter(Boolean).join("/")]
                      .filter(Boolean)
                      .join(" · ") || "Sem endereço cadastrado"}
                    {u.cnpj ? ` · CNPJ ${maskCNPJ(u.cnpj)}` : ""}
                  </span>
                </button>
              ))}
              {clientId && filteredUnits.length === 0 && (
                <p className="py-2 text-xs text-muted-foreground">
                  Nenhuma unidade encontrada para esta empresa.
                </p>
              )}
            </div>
          </div>

          {changed && displacementChanged && (
            <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
              A nova unidade tem parâmetros de deslocamento diferentes. Revise o resumo financeiro
              da OS após salvar — nenhum valor já lançado é alterado automaticamente.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!changed || mutation.isPending || !clientId}
          >
            {mutation.isPending ? "Salvando..." : "Salvar alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}