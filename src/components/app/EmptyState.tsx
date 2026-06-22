import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-dashed border-white/[0.14] bg-white/[0.025] p-8 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.75) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="relative">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.16)]">
          <Icon size={26} strokeWidth={1.8} />
        </div>
        <h3 className="mt-4 font-display text-base font-black text-foreground">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}
