import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  addServiceOrderTechnicians,
  createTechnician,
  listTechnicians,
} from "@/lib/api/serviceOrders.functions";
import type { AssignedTechnician, TechnicianLite } from "@/types/serviceOrder";

function parseRate(input: string): number | null {
  const clean = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * Permite ao admin, dentro da apuração de horas, incluir na OS um técnico que
 * ainda não está na equipe — escolhendo um já cadastrado ou cadastrando um novo.
 */
export function AddTechnicianToLaborDialog({
  open,
  onOpenChange,
  orderId,
  existingIds,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  existingIds: string[];
  onAdded: (technician: AssignedTechnician) => void;
}) {
  const [tab, setTab] = useState<"existing" | "new">("existing");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState("");
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTechnicians);
  const createFn = useServerFn(createTechnician);
  const addFn = useServerFn(addServiceOrderTechnicians);

  const techniciansQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => listFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const existing = useMemo(() => new Set(existingIds), [existingIds]);
  const available = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return ((techniciansQuery.data ?? []) as TechnicianLite[])
      .filter((t) => t.active !== false && !existing.has(t.id))
      .filter((t) => !q || t.full_name.toLocaleLowerCase().includes(q));
  }, [techniciansQuery.data, existing, query]);

  const reset = () => {
    setQuery("");
    setName("");
    setRole("");
    setPhone("");
    setRate("");
    setTab("existing");
  };

  const finish = async (tech: TechnicianLite) => {
    // Adiciona na apuração imediatamente; as horas são gravadas na finalização
    // por technician_id. Vincular à equipe é best-effort e não bloqueia.
    onAdded({ ...tech, is_primary: false, is_history: false });
    toast.success(`${tech.full_name} adicionado à apuração.`);
    reset();
    onOpenChange(false);
    try {
      await addFn({ data: { orderId, technicianIds: [tech.id] } });
    } catch (e) {
      console.warn("Vínculo do técnico à equipe não gravado:", e);
    }
    queryClient.invalidateQueries({ queryKey: ["service-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    queryClient.invalidateQueries({ queryKey: ["order-history-technicians", orderId] });
    queryClient.invalidateQueries({ queryKey: ["technicians"] });
  };

  const pickMutation = useMutation({
    mutationFn: (tech: TechnicianLite) => finish(tech),
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const full_name = name.trim();
      if (full_name.length < 2) throw new Error("Informe o nome do técnico.");
      const created = (await createFn({
        data: {
          full_name,
          role: role.trim() || null,
          phone: phone.trim() || null,
          hourly_rate_cents: parseRate(rate),
          active: true,
        },
      })) as TechnicianLite;
      await finish(created);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const busy = pickMutation.isPending || createMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar técnico à OS</DialogTitle>
          <DialogDescription>
            O técnico entra na equipe da OS e ganha uma linha de horário na apuração.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["existing", "new"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                tab === key ? "bg-background text-foreground shadow" : "text-muted-foreground",
              )}
            >
              {key === "existing" ? "Já cadastrado" : "Cadastrar novo"}
            </button>
          ))}
        </div>

        {tab === "existing" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar técnico"
                className="pl-8"
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {techniciansQuery.isLoading ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : available.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum técnico disponível. Use "Cadastrar novo".
                </p>
              ) : (
                available.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy}
                    onClick={() => pickMutation.mutate(t)}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                  >
                    <span className="font-semibold">{t.full_name}</span>
                    <span className="text-xs text-muted-foreground">{t.role ?? ""}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Função</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Técnico" />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Valor/hora (R$)</Label>
              <Input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {tab === "new" && (
            <Button type="button" disabled={busy} onClick={() => createMutation.mutate()}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Cadastrar e adicionar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
