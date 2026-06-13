import type { LucideIcon } from "lucide-react";
export function SectionHeader({ title, eyebrow, icon: Icon, action }: { title: string; eyebrow?: string; icon?: LucideIcon; action?: React.ReactNode }) {
  return <div className="mb-2 flex items-end justify-between gap-3 px-1"><div>{eyebrow && <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{eyebrow}</p>}<h2 className="section-title flex items-center gap-2">{Icon && <Icon size={15} className="text-primary" />}{title}</h2></div>{action}</div>;
}
