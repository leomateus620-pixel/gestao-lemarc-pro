import { ClipboardCheck } from "lucide-react";
import type { ServiceOrder } from "@/types/serviceOrder";
import { TechnicianOrderCard } from "./TechnicianOrderCard";

type Props = {
  orders: ServiceOrder[];
  actionCount: number;
};

export function TechnicianOrderList({ orders, actionCount }: Props) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <h2 className="section-title flex min-w-0 items-center gap-2">
          <ClipboardCheck size={15} className="shrink-0 text-primary" />
          <span className="truncate">OS atribuídas</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          <Counter label="Abertas" value={orders.length} />
          <Counter label="Ação" value={actionCount} emphasis={actionCount > 0} />
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[1.1rem] border border-dashed border-white/12 bg-[linear-gradient(180deg,oklch(1_0_0/0.06),oklch(1_0_0/0.025)),oklch(0.13_0.034_252/0.84)] p-5 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.1)]">
          <p className="font-display text-base font-black text-white">
            Nenhuma OS recente atribuída a você.
          </p>
          <p className="mt-1 text-sm font-medium text-slate-400">
            Crie uma nova OS para iniciar um atendimento.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {orders.map((order) => (
            <TechnicianOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}

function Counter({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] " +
        (emphasis
          ? "border-primary/40 bg-primary/12 text-primary"
          : "border-[color:var(--on-app-bg)]/10 bg-white/45 text-[color:var(--on-app-bg-muted)]")
      }
    >
      <span className="tabular-nums">{value}</span>
      {label}
    </span>
  );
}
