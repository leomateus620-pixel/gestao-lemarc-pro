import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Truck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RequireAdmin } from "@/lib/auth/requireAdmin";
import {
  getDisplacementRateCents,
  setDisplacementRateCents,
} from "@/lib/api/systemSettings.functions";
import { formatBRL, parseBRLToCents } from "@/lib/serviceOrders/finance";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Gestão Lemarc" }] }),
  component: () => (
    <RequireAdmin>
      <ConfiguracoesPage />
    </RequireAdmin>
  ),
});

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getDisplacementRateCents);
  const setFn = useServerFn(setDisplacementRateCents);

  const { data: currentCents, isLoading } = useQuery({
    queryKey: ["system-settings", "displacement-rate"],
    queryFn: () => getFn(),
    staleTime: 30_000,
  });

  const [input, setInput] = useState("");
  useEffect(() => {
    if (currentCents != null) {
      setInput((currentCents / 100).toFixed(2).replace(".", ","));
    }
  }, [currentCents]);

  const mut = useMutation({
    mutationFn: () => setFn({ data: { cents: parseBRLToCents(input) } }),
    onSuccess: () => {
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["system-settings", "displacement-rate"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const previewCents = parseBRLToCents(input);

  return (
    <AppShell title="Configurações" back>
      <main className="mx-auto max-w-3xl space-y-4">
        <GlassCard className="lemarc-wizard-card space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/35 bg-primary/14 text-primary">
              <Truck size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                Deslocamento padrão
              </p>
              <h1 className="mt-1 font-display text-2xl font-black leading-tight text-white">
                Valor padrão por km
              </h1>
              <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-300">
                Preço utilizado para calcular o deslocamento nas OS. Este valor será aplicado para
                todos os clientes e unidades.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
              Valor por km (R$)
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                inputMode="decimal"
                placeholder="2,50"
                disabled={isLoading}
                className="h-12 max-w-xs rounded-xl border-white/10 bg-white/[0.07] font-semibold tabular-nums focus-visible:ring-primary/40"
              />
              <span className="text-sm font-semibold text-slate-400">
                {previewCents > 0 ? `= ${formatBRL(previewCents)} / km` : "Informe o valor"}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500">
              A distância de cada cliente/unidade é configurada no cadastro da unidade.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={mut.isPending || previewCents <= 0}
              onClick={() => mut.mutate()}
              className="lemarc-primary-action lemarc-orange-glow h-12 rounded-xl px-5 font-display text-xs font-black uppercase tracking-wider"
            >
              {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {mut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </GlassCard>
      </main>
    </AppShell>
  );
}