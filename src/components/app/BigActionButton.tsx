import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
export function BigActionButton({ children, icon: Icon, ...props }: React.ComponentProps<typeof Button> & { icon?: LucideIcon }) {
  return <Button {...props} className={`h-14 w-full gap-2 rounded-2xl text-sm font-black uppercase tracking-wider shadow-[var(--shadow-glow-orange)] ${props.className ?? ""}`}>{Icon && <Icon size={20} />}{children}</Button>;
}
