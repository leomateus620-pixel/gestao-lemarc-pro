import { Activity, ClipboardCheck } from "lucide-react";

type Props = {
  firstName: string;
  orderCount: number;
  actionCount: number;
};

export function TechnicianHomeHero({ firstName, orderCount, actionCount }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-white/14 bg-[radial-gradient(ellipse_68%_72%_at_100%_0%,oklch(0.72_0.19_50/0.22),transparent_62%),linear-gradient(145deg,oklch(0.245_0.046_252/0.98),oklch(0.115_0.034_252/0.985))] p-4 text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.16),inset_0_-1px_0_oklch(0_0_0/0.32),0_22px_50px_-32px_oklch(0_0_0/0.86),0_8px_22px_-18px_oklch(0.72_0.19_50/0.34)] sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,oklch(1_0_0/0.12),transparent_26%,transparent_70%,oklch(0.72_0.19_50/0.1))] opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
      />

      <div className="relative">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-primary">
          Bem-vindo, {firstName}
        </p>
        <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-[1.7rem] font-black leading-none tracking-normal text-white sm:text-3xl">
              Central do técnico
            </h1>
            <p className="mt-2 max-w-xl text-[0.86rem] font-medium leading-5 text-slate-300">
              Acompanhe suas OS e registre a execução em campo.
            </p>
          </div>

          <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 lemarc-smart-scroll sm:pb-0">
            <HeroPill icon={ClipboardCheck} label="OS abertas" value={orderCount} />
            <HeroPill icon={Activity} label="Ação" value={actionCount} />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-[6.8rem] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-2.5 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.1)]">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/15 text-primary">
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </span>
        <span className="block font-display text-lg font-black leading-none text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </span>
    </div>
  );
}

export function TechnicianHomeSkeleton() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-3 pb-6">
      <div className="relative h-[8.4rem] overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04]">
        <div className="lemarc-shimmer absolute inset-0 opacity-25" />
      </div>
      <div className="relative h-[4.6rem] overflow-hidden rounded-[1.15rem] border border-white/[0.08] bg-white/[0.04]">
        <div className="lemarc-shimmer absolute inset-0 opacity-25" />
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="relative h-[8.8rem] overflow-hidden rounded-[1.1rem] border border-white/[0.08] bg-white/[0.04] sm:h-[7.2rem]"
          >
            <div className="lemarc-shimmer absolute inset-0 opacity-25" />
          </div>
        ))}
      </div>
    </main>
  );
}
