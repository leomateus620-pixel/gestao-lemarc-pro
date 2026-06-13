import { Cog } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const icon = size === "lg" ? 32 : size === "sm" ? 18 : 22;
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-glow-orange)]">
        <Cog size={icon} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 leading-tight">
        <div className={`font-display font-black tracking-tight text-foreground ${text}`}>
          GESTÃO <span className="text-primary">LEMARC</span>
        </div>
        {size === "lg" && (
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Industrial · OS Digital
          </div>
        )}
      </div>
    </div>
  );
}
