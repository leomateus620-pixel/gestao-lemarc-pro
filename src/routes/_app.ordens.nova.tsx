import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientes } from "@/lib/mock/clientes";
import { colaboradores } from "@/lib/mock/colaboradores";
import { Check, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/ordens/nova")({
  head: () => ({ meta: [{ title: "Nova OS — Gestão Lemarc" }] }),
  component: NovaOS,
});

const steps = ["Cliente", "Unidade", "Colaborador", "Detalhes", "Revisar"] as const;

function NovaOS() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [cliente, setCliente] = useState(clientes[0]);
  const [unidade, setUnidade] = useState(clientes[0].unidades[0]);
  const [colab, setColab] = useState(colaboradores[0]);
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [prio, setPrio] = useState<"baixa" | "media" | "alta">("media");

  const next = () => {
    if (step === steps.length - 1) nav({ to: "/ordens" });
    else setStep((s) => s + 1);
  };

  return (
    <AppShell title="Nova ordem de serviço" back>
      <div className="mt-2 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-1.5">
            <div className={`flex h-7 flex-1 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider ${
              i < step ? "bg-primary/20 text-primary" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-[11px] font-bold uppercase tracking-widest text-primary">
        Etapa {step + 1} de {steps.length} · {steps[step]}
      </div>

      <div className="mt-5 space-y-3">
        {step === 0 && clientes.map((c) => (
          <button key={c.id} onClick={() => { setCliente(c); setUnidade(c.unidades[0]); }}
            className={`w-full text-left transition-transform active:scale-[0.99]`}>
            <GlassCard className={`p-4 ${cliente.id === c.id ? "border-primary/60 bg-primary/10" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-foreground">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{c.segmento} · {c.cidade}</div>
                </div>
                {cliente.id === c.id && <Check className="shrink-0 text-primary" size={20} />}
              </div>
            </GlassCard>
          </button>
        ))}

        {step === 1 && cliente.unidades.map((u) => (
          <button key={u} onClick={() => setUnidade(u)} className="w-full text-left">
            <GlassCard className={`flex items-center justify-between p-4 ${unidade === u ? "border-primary/60 bg-primary/10" : ""}`}>
              <div>
                <div className="font-display text-base font-bold text-foreground">Unidade {u}</div>
                <div className="text-xs text-muted-foreground">{cliente.nome}</div>
              </div>
              {unidade === u && <Check className="text-primary" size={20} />}
            </GlassCard>
          </button>
        ))}

        {step === 2 && colaboradores.map((c) => (
          <button key={c.id} onClick={() => setColab(c)} className="w-full text-left">
            <GlassCard className={`flex items-center justify-between p-4 ${colab.id === c.id ? "border-primary/60 bg-primary/10" : ""}`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary font-display font-black text-primary">
                  {c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-bold text-foreground">{c.nome}</div>
                  <div className="text-xs text-muted-foreground">{c.funcao}</div>
                </div>
              </div>
              {colab.id === c.id && <Check className="shrink-0 text-primary" size={20} />}
            </GlassCard>
          </button>
        ))}

        {step === 3 && (
          <GlassCard className="space-y-4 p-5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Título do serviço</label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Manutenção do compressor" className="mt-1.5 h-11 border-border bg-secondary/60" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Detalhes da execução, ferramentas, EPI..." className="mt-1.5 min-h-28 border-border bg-secondary/60" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prioridade</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(["baixa", "media", "alta"] as const).map((p) => (
                  <button key={p} onClick={() => setPrio(p)} className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                    prio === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 text-muted-foreground"
                  }`}>{p}</button>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {step === 4 && (
          <GlassCard className="space-y-3 p-5 text-sm">
            <Row k="Cliente" v={cliente.nome} />
            <Row k="Unidade" v={unidade} />
            <Row k="Colaborador" v={colab.nome} />
            <Row k="Função" v={colab.funcao} />
            <Row k="Título" v={titulo || "—"} />
            <Row k="Prioridade" v={prio.toUpperCase()} />
            <div className="border-t border-border pt-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Descrição</div>
              <p className="mt-1 text-sm text-foreground">{desc || "—"}</p>
            </div>
          </GlassCard>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="h-12 flex-1 bg-secondary text-foreground hover:bg-secondary/80">
            Voltar
          </Button>
        )}
        <Button onClick={next} className="h-12 flex-[2] gap-2 text-sm font-bold uppercase tracking-wider shadow-[var(--shadow-glow-orange)]">
          {step === steps.length - 1 ? "Criar OS" : "Continuar"} <ChevronRight size={18} />
        </Button>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{k}</span>
      <span className="text-right font-semibold text-foreground">{v}</span>
    </div>
  );
}
