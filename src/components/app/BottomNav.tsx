import { Link } from "@tanstack/react-router";
import { BarChart3, ClipboardList, HardHat, Home, MoreHorizontal, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const items = [
  { to: "/dashboard", label: "Início", mobileLabel: "Início", compactLabel: "Início", icon: Home },
  {
    to: "/ordens",
    label: "Ordens",
    mobileLabel: "Ordens",
    compactLabel: "Ordens",
    icon: ClipboardList,
  },
  {
    to: "/clientes",
    label: "Clientes",
    mobileLabel: "Clientes",
    compactLabel: "Clientes",
    icon: Users,
  },
  {
    to: "/colaboradores",
    label: "Colaboradores",
    mobileLabel: "Colabs.",
    compactLabel: "Colabs.",
    icon: HardHat,
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    mobileLabel: "Relatórios",
    compactLabel: "Relat.",
    icon: BarChart3,
  },
  { to: "/mais", label: "Mais", mobileLabel: "Mais", compactLabel: "Mais", icon: MoreHorizontal },
] as const;

const TECNICO_ROUTES = new Set<string>(["/dashboard", "/mais"]);

export function BottomNav() {
  const { isAdmin, isOperador, loading } = useUserRole();
  // Enquanto o papel carrega, tratar como técnico para NÃO piscar itens de admin.
  // Só liberamos a barra completa quando confirmamos admin/operador.
  const showFull = !loading && (isAdmin || isOperador);
  const visibleItems = showFull ? items : items.filter((i) => TECNICO_ROUTES.has(i.to));
  const cols = visibleItems.length;
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] sm:px-4"
    >
      <div
        className="lemarc-bottom-nav-shell mx-auto mb-2 grid w-full max-w-lg gap-0.5 p-1 sm:max-w-2xl sm:gap-1 sm:p-1.5 lg:max-w-3xl"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {visibleItems.map(({ to, label, mobileLabel, compactLabel, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            title={label}
            activeOptions={{ exact: to === "/dashboard" }}
            className="lemarc-bottom-nav-item lemarc-pressable group"
          >
            <Icon aria-hidden="true" className="lemarc-bottom-nav-icon" />
            <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--desktop">
              {label}
            </span>
            <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--mobile">
              {mobileLabel}
            </span>
            <span className="lemarc-bottom-nav-label lemarc-bottom-nav-label--compact">
              {compactLabel}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
