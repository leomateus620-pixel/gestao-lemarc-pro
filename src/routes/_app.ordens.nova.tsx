import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { GlassCard } from "@/components/app/GlassCard";
import { BigActionButton } from "@/components/app/BigActionButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientes } from "@/lib/mock/clients";
import { colaboradores } from "@/lib/mock/collaborators";
import type { Priority } from "@/components/app/PriorityBadge";
import type { ServiceType } from "@/lib/mock/serviceOrders";
import { Check, ChevronRight, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_app/ordens/nova")({ head: () => ({ meta: [{ title: "Nova OS — Gestão Lemarc" }] }), component: NovaOS });
const steps = ["Cliente", "Serviço", "Equipe", "Descrição", "Revisão"] as const;
const tipos: ServiceType[] = ["Manutenção Mecânica", "Manutenção Elétrica", "Automação Industrial", "Montagem Industrial", "Instalação", "Visita Técnica", "Emergência"];

function NovaOS() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [cliente, setCliente] = useState(clientes[0]);
  const [unidade, setUnidade] = useState(clientes[0].unidades[0]);
  const [tipo, setTipo] = useState<ServiceType>(tipos[0]);
  const [colab, setColab] = useState(colaboradores[0]);
  const [titulo, setTitulo] = useState("");
  const [desc, setDesc] = useState("");
  const [prio, setPrio] = useState<Priority>("media");
  const next = () => step === steps.length - 1 ? nav({ to: "/ordens" }) : setStep((s) => s + 1);

  return <AppShell title="Nova ordem de serviço" back>
    <div className="mt-2 grid grid-cols-5 gap-1.5">{steps.map((s, i) => <div key={s} className={`h-2 rounded-full ${i <= step ? "bg-primary shadow-[var(--shadow-glow-orange)]" : "bg-secondary"}`} />)}</div>
    <div className="mt-3 text-center text-[11px] font-black uppercase tracking-widest text-primary">Etapa {step + 1} de {steps.length} · {steps[step]}</div>

    <div className="mt-5 space-y-3">
      {step === 0 && <><GlassCard className="p-4"><p className="section-title">Cliente e unidade</p><p className="mt-1 text-xs text-muted-foreground">Selecione o cliente industrial e a unidade operacional.</p></GlassCard>{clientes.map((c) => <button key={c.id} onClick={() => { setCliente(c); setUnidade(c.unidades[0]); }} className="w-full text-left active:scale-[0.99]"><GlassCard className={`p-4 ${cliente.id === c.id ? "border-primary/60 bg-primary/10" : ""}`}><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-display text-base font-bold text-foreground">{c.nome}</div><div className="text-xs text-muted-foreground">{c.segmento} · {c.cidade}</div><div className="mt-2 flex flex-wrap gap-1.5">{c.unidades.map((u) => <span key={u} onClick={(e) => { e.stopPropagation(); setCliente(c); setUnidade(u); }} className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${cliente.id === c.id && unidade === u ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 text-muted-foreground"}`}>{u}</span>)}</div></div>{cliente.id === c.id && <Check className="shrink-0 text-primary" size={20} />}</div></GlassCard></button>)}</>}

      {step === 1 && <GlassCard className="space-y-4 p-5"><div><label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Tipo de serviço</label><div className="mt-2 grid gap-2">{tipos.map((t) => <button key={t} onClick={() => setTipo(t)} className={`rounded-xl border px-3 py-3 text-left text-sm font-bold ${tipo === t ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/50 text-foreground"}`}>{t}</button>)}</div></div><div><label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Prioridade</label><div className="mt-2 grid grid-cols-3 gap-2">{(["baixa", "media", "alta"] as const).map((p) => <button key={p} onClick={() => setPrio(p)} className={`rounded-xl border px-3 py-3 text-xs font-black uppercase tracking-wider ${prio === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 text-muted-foreground"}`}>{p}</button>)}</div></div></GlassCard>}

      {step === 2 && colaboradores.map((c) => <button key={c.id} onClick={() => setColab(c)} className="w-full text-left"><GlassCard className={`flex items-center justify-between p-4 ${colab.id === c.id ? "border-primary/60 bg-primary/10" : ""}`}><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary font-display font-black text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div className="min-w-0"><div className="truncate font-display text-sm font-bold text-foreground">{c.nome}</div><div className="text-xs text-muted-foreground">{c.funcao} · {c.status}</div></div></div>{colab.id === c.id && <Check className="shrink-0 text-primary" size={20} />}</GlassCard></button>)}

      {step === 3 && <GlassCard className="space-y-4 p-5"><div><label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Título do serviço</label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Manutenção do compressor" className="mt-1.5 h-12 border-border bg-secondary/60" /></div><div><label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Descrição inicial</label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Sintoma, escopo, ferramentas, EPI e observações iniciais..." className="mt-1.5 min-h-32 border-border bg-secondary/60" /></div></GlassCard>}

      {step === 4 && <GlassCard className="space-y-3 p-5 text-sm"><Row k="Cliente" v={cliente.nome} /><Row k="Unidade" v={unidade} /><Row k="Tipo" v={tipo} /><Row k="Prioridade" v={prio.toUpperCase()} /><Row k="Colaborador" v={colab.nome} /><Row k="Função" v={colab.funcao} /><Row k="Título" v={titulo || "OS mockada sem título"} /><div className="border-t border-border pt-3"><div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Descrição</div><p className="mt-1 text-sm text-foreground">{desc || "Descrição inicial será preenchida em campo."}</p></div></GlassCard>}
    </div>

    <div className="mt-6 flex gap-2 pb-2">{step > 0 && <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="h-12 flex-1 bg-secondary text-foreground hover:bg-secondary/80">Voltar</Button>}<BigActionButton onClick={next} icon={step === steps.length - 1 ? ClipboardCheck : ChevronRight} className="flex-[2]">{step === steps.length - 1 ? "Criar OS mockada" : "Continuar"}</BigActionButton></div>
  </AppShell>;
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex items-baseline justify-between gap-3"><span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{k}</span><span className="text-right font-semibold text-foreground">{v}</span></div>; }
