import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-dashed border-white/[0.12] bg-white/[0.02] p-6 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />
      <div className="relative">
        {/* hex/diamond frame */}
        <div className="relative mx-auto grid h-16 w-16 place-items-center">
          <span
            aria-hidden
            className="absolute inset-0 rotate-45 rounded-[0.95rem] border border-primary/30 bg-primary/[0.08] shadow-[inset_0_1px_0_oklch(1_0_0/0.16)]"
          />
          <span
            aria-hidden
            className="absolute inset-1.5 rotate-45 rounded-[0.75rem] border border-primary/20"
          />
          <Icon size={24} strokeWidth={1.8} className="relative text-primary" />
        </div>
        <h3 className="mt-5 font-display text-base font-black text-foreground sm:text-lg">
          {title}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}
