import { Link } from "@tanstack/react-router";
import { Home, ClipboardList, Users, BarChart3, MoreHorizontal } from "lucide-react";
const items = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/ordens", label: "Ordens", icon: ClipboardList },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/colaboradores", label: "Mais", icon: MoreHorizontal },
] as const;
export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]">
      <div className="lemarc-bottom-nav-shell mx-auto mb-2 grid w-full max-w-md grid-cols-5 gap-1 rounded-3xl p-1.5 sm:max-w-2xl lg:max-w-3xl">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/dashboard" }}
            className="lemarc-pressable group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-muted-foreground data-[status=active]:bg-primary/15 data-[status=active]:text-primary"
          >
            <Icon size={20} />
            <span className="max-w-full truncate text-[9px] font-black uppercase tracking-[0.02em] sm:tracking-[0.08em]">
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
