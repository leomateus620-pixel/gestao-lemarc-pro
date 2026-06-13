import { Link } from "@tanstack/react-router";
import { Home, ClipboardList, Users, BarChart3, HardHat } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/ordens", label: "Ordens", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/colaboradores", label: "Mais", icon: HardHat },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="glass-strong mx-auto mb-3 grid w-full max-w-md grid-cols-5 gap-1 rounded-2xl p-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/dashboard" }}
            className="group flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-muted-foreground transition-colors data-[status=active]:bg-primary/15 data-[status=active]:text-primary"
          >
            <Icon size={20} strokeWidth={2.2} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
