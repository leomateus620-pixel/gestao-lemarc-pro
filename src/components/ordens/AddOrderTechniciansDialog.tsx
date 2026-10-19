import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Play, Plus, Search } from "lucide-react";
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
import { linkOrderTechnicians, listTechnicians } from "@/lib/api/serviceOrders.functions";
import { linkDialogOptions } from "@/lib/serviceOrders/teamActions";
import { invalidateOrderTeamQueries } from "@/lib/serviceOrders/teamCache";
import type { ServiceOrderStatus, TechnicianLite } from "@/types/serviceOrder";

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AddOrderTechniciansDialog({
  orderId,
  orderStatus,
  assignedTechnicianIds,
}: {
  orderId: string;
  orderStatus: ServiceOrderStatus;
  assignedTechnicianIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Uma chave por intenção: a mesma enquanto o diálogo está aberto e a seleção
  // não muda, para que retentativas não abram outra sessão.
  const keyRef = useRef<{ key: string; sig: string } | null>(null);
  const queryClient = useQueryClient();
  const listFn = useServerFn(listTechnicians);
  const linkFn = useServerFn(linkOrderTechnicians);
  const options = linkDialogOptions(orderStatus);

  const techniciansQuery = useQuery({
    queryKey: ["technicians"],
    queryFn: () => listFn(),
    enabled: open,
    staleTime: 60_000,
  });
  const technicians = (techniciansQuery.data ?? []) as TechnicianLite[];
  const assigned = useMemo(() => new Set(assignedTechnicianIds), [assignedTechnicianIds]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return technicians
      .filter((t) => t.active !== false || assigned.has(t.id))
      .filter(
        (t) =>
          !q ||
          t.full_name.toLocaleLowerCase().includes(q) ||
          (t.role ?? "").toLocaleLowerCase().includes(q),
      );
  }, [assigned, query, technicians]);
  const availableCount = visible.filter((t) => !assigned.has(t.id)).length;

  function keyFor(start: boolean) {
    const sig = `${start ? "s" : "l"}:${[...selected].sort().join(",")}`;
    if (!keyRef.current || keyRef.current.sig !== sig) keyRef.current = { key: newKey(), sig };
    return keyRef.current.key;
  }

  const mutation = useMutation({
    mutationFn: (start: boolean) =>
      linkFn({
        data: { orderId, technicianIds: selected, start, requestKey: keyFor(start) },
      }),
    onSuccess: (result, start) => {
      const added = result.added.length;
      const started = result.started.length;
      if (start) {
        toast.success(
          started > 0
            ? `${started === 1 ? "Técnico vinculado e iniciado" : `${started} técnicos vinculados e iniciados`}.`
            : "Os técnicos selecionados já estavam com tempo em andamento.",
        );
      } else {
        toast.success(
          added > 0
            ? added === 1
              ? "Técnico vinculado à OS."
              : `${added} técnicos vinculados à OS.`
            : "Os técnicos selecionados já estavam na OS.",
        );
      }
      invalidateOrderTeamQueries(queryClient, orderId);
      keyRef.current = null;
      setSelected([]);
      setQuery("");
      setError(null);
      setOpen(false);
    },
    onError: (e) => {
      // Mantém a chave: nova tentativa devolve o resultado gravado, se houver.
      setError(e instanceof Error ? e.message : "Não foi possível vincular os técnicos.");
      invalidateOrderTeamQueries(queryClient, orderId);
    },
  });

  function toggle(id: string) {
    if (assigned.has(id) || mutation.isPending) return;
    setError(null);
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (!options.canLink) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return;
        setOpen(next);
        if (next) {
          setSelected([]);
          setQuery("");
          setError(null);
          keyRef.current = null;
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm" className="gap-2 rounded-xl">
          <Plus size={14} /> Adicionar técnico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] max-w-md overflow-hidden sm:max-h-[calc(100dvh-2rem)]">
        <DialogHeader>
          <DialogTitle>Adicionar técnico à OS</DialogTitle>
          <DialogDescription>
            Quem já está na OS continua com os mesmos horários. Cada novo técnico conta só a partir
            do próprio início.
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
              onChange={(e) => setQuery(e.target.value)}
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
          ) : availableCount === 0 && visible.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Nenhum técnico ativo encontrado.
            </p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {visible.map((t) => {
                const linked = assigned.has(t.id);
                const isSelected = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    disabled={linked}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      linked
                        ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                        : isSelected
                          ? "border-primary/50 bg-primary/10"
                          : "border-border bg-card hover:bg-muted/40"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {t.full_name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {linked ? "Já está na OS" : (t.role ?? "")}
                      </span>
                    </span>
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        isSelected || linked
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

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="secondary"
            className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:shadow-none"
            onClick={() => mutation.mutate(false)}
            disabled={selected.length === 0 || mutation.isPending}
          >
            {mutation.isPending && mutation.variables === false ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Plus size={16} className="mr-2" />
            )}
            Vincular técnico
          </Button>
          {options.canStart && (
            <Button
              type="button"
              className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:shadow-none"
              onClick={() => mutation.mutate(true)}
              disabled={selected.length === 0 || mutation.isPending}
            >
              {mutation.isPending && mutation.variables === true ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Play size={16} className="mr-2" />
              )}
              Vincular e iniciar agora
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
