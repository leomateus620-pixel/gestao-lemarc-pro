import type { LucideIcon } from "lucide-react";
import { GlassCard } from "./GlassCard";
export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <GlassCard className="p-8 text-center"><Icon className="mx-auto text-primary" size={28} /><h3 className="mt-3 font-display text-base font-black text-foreground">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></GlassCard>; }
