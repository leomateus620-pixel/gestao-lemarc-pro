import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileBox,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Warehouse,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/components/app/AuthContext";
import { useWireTrayAccess } from "./WireTrayAccessContext";
import { hasWireTrayPermission, type WireTrayPermission } from "@/lib/wireTrays/domain";
import { markWireTrayNotification } from "@/lib/api/wireTrayOperations.functions";
import { useWireTrayNotificationsQuery, wireTrayKeys } from "@/hooks/useWireTray";
import { wireTrayRoleLabel } from "@/types/wireTray";
import { cn } from "@/lib/utils";

const LOGO = "/branding/lemarc-login-logo.png";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  permission?: WireTrayPermission;
};

const navigation: NavItem[] = [
  { to: "/leitos", label: "Visão geral", icon: Home },
  { to: "/leitos/pedidos", label: "Pedidos", icon: ShoppingCart },
  { to: "/leitos/producao", label: "Produção", icon: Factory },
  { to: "/leitos/estoque", label: "Estoque", icon: Warehouse },
  { to: "/leitos/separacao", label: "Separação", icon: ClipboardCheck, permission: "separate" },
  { to: "/leitos/faturamento", label: "Faturamento", icon: FileBox, permission: "bill" },
  { to: "/leitos/produtos", label: "Produtos", icon: PackageSearch },
  { to: "/leitos/movimentacoes", label: "Movimentações", icon: ClipboardList },
  { to: "/leitos/relatorios", label: "Relatórios", icon: BarChart3 },
  {
    to: "/leitos/configuracoes",
    label: "Configurações",
    icon: Settings,
    permission: "manage_products",
  },
];

const pageTitles: Array<[string, string]> = [
  ["/leitos/configuracoes/acessos", "Acessos do módulo"],
  ["/leitos/configuracoes", "Configurações"],
  ["/leitos/movimentacoes", "Movimentações"],
  ["/leitos/relatorios", "Relatórios"],
  ["/leitos/faturamento", "Faturamento"],
  ["/leitos/separacao", "Separação e conferência"],
  ["/leitos/produtos/novo", "Novo produto"],
  ["/leitos/produtos", "Produtos"],
  ["/leitos/producao/nova", "Nova ordem de produção"],
  ["/leitos/producao", "Produção"],
  ["/leitos/estoque", "Estoque"],
  ["/leitos/pedidos/novo", "Novo pedido"],
  ["/leitos/pedidos", "Pedidos"],
  ["/leitos/mais", "Mais"],
  ["/leitos", "Visão geral"],
];

export function LeitosShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { displayName, email, avatarUrl, signOut } = useAuth();
  const access = useWireTrayAccess();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useWireTrayNotificationsQuery();
  const queryClient = useQueryClient();
  const markNotification = useServerFn(markWireTrayNotification);
  const markMutation = useMutation({
    mutationFn: (id: string) => markNotification({ data: { id, dismiss: false } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wireTrayKeys.notifications }),
  });
  const visibleNavigation = useMemo(
    () =>
      navigation.filter(
        (item) =>
          !item.permission ||
          hasWireTrayPermission(access.role, item.permission, access.financialAccess),
      ),
    [access],
  );
  const title =
    pageTitles.find(([path]) =>
      path === "/leitos" ? location.pathname === path : location.pathname.startsWith(path),
    )?.[1] ?? "Leitos Aramados";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  async function handleSignOut() {
    await signOut();
    navigate({
      to: "/login",
      search: { module: "wire_trays", redirect: undefined },
      replace: true,
    });
  }

  return (
    <div className="wire-root min-h-dvh" data-sidebar-collapsed={collapsed ? "true" : "false"}>
      <aside className={cn("wire-sidebar hidden lg:flex", collapsed && "wire-sidebar-collapsed")}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-4">
            <Link to="/leitos" className="min-w-0 flex-1" aria-label="Início de Leitos Aramados">
              <img
                src={LOGO}
                alt="Gestão Lemarc"
                className={cn(
                  "h-10 w-auto object-contain",
                  collapsed && "h-8 max-w-10 object-left",
                )}
              />
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="wire-icon-btn-dark"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <div className="px-4 py-4">
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.16em] text-orange-300",
                collapsed && "sr-only",
              )}
            >
              Módulo industrial
            </p>
            <p
              className={cn(
                "mt-1 font-display text-lg font-extrabold text-white",
                collapsed && "sr-only",
              )}
            >
              Leitos Aramados
            </p>
            {collapsed && <Boxes className="mx-auto text-orange-300" size={22} />}
          </div>
          <nav
            aria-label="Navegação de Leitos Aramados"
            className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4"
          >
            {visibleNavigation.map((item) => (
              <ModuleNavLink key={item.to} item={item} collapsed={collapsed} />
            ))}
          </nav>
          <div className="border-t border-white/10 p-3">
            <Link to="/dashboard" className="wire-module-switch" title="Abrir Ordens de Serviço">
              <ChevronLeft size={17} />
              {!collapsed && <span>Ordens de Serviço</span>}
            </Link>
          </div>
        </div>
      </aside>

      <div className="wire-content-shell">
        <header className="wire-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(true)}
              className="wire-icon-btn lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:block">
                Leitos Aramados
              </p>
              <h1 className="truncate font-display text-lg font-extrabold text-slate-950 sm:text-xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              className="wire-icon-btn relative"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label={`${notifications.data?.length ?? 0} notificações não lidas`}
              aria-expanded={notificationsOpen}
            >
              <Bell size={19} />
              {(notifications.data?.length ?? 0) > 0 && (
                <span className="wire-notification-dot">{notifications.data?.length}</span>
              )}
            </button>
            <div className="hidden min-w-0 text-right md:block">
              <p className="max-w-44 truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="text-xs text-slate-500">{wireTrayRoleLabel[access.role]}</p>
            </div>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-10 rounded-xl border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-xl bg-slate-900 text-xs font-extrabold uppercase text-white">
                {initials}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="wire-icon-btn hidden sm:grid"
              aria-label="Sair"
              title={email ?? "Sair"}
            >
              <LogOut size={18} />
            </button>
            {notificationsOpen && (
              <div className="wire-notification-panel">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="font-display text-sm font-extrabold text-slate-950">Notificações</p>
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="wire-icon-btn size-9"
                    aria-label="Fechar notificações"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {notifications.isLoading ? (
                    <div className="space-y-2 p-2">
                      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                      <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                  ) : notifications.data?.length ? (
                    notifications.data.map((notification) => (
                      <a
                        key={notification.id}
                        href={notification.route ?? "/leitos"}
                        onClick={() => markMutation.mutate(notification.id)}
                        className="block rounded-xl px-3 py-3 hover:bg-slate-50"
                      >
                        <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                        {notification.message && (
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {notification.message}
                          </p>
                        )}
                      </a>
                    ))
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhuma notificação pendente.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="wire-main">{children}</main>
      </div>

      <nav
        className="wire-mobile-nav lg:hidden"
        aria-label="Navegação principal de Leitos Aramados"
      >
        <MobileNavItem to="/leitos" label="Início" icon={Home} exact />
        <MobileNavItem to="/leitos/pedidos" label="Pedidos" icon={ShoppingCart} />
        <MobileNavItem to="/leitos/producao" label="Produção" icon={Factory} />
        <MobileNavItem to="/leitos/estoque" label="Estoque" icon={Warehouse} />
        <MobileNavItem to="/leitos/mais" label="Mais" icon={MoreHorizontal} />
      </nav>

      {mobileMenu && (
        <div
          className="wire-mobile-menu-backdrop lg:hidden"
          role="presentation"
          onClick={() => setMobileMenu(false)}
        >
          <aside
            className="wire-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Leitos Aramados"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <img src={LOGO} alt="Gestão Lemarc" className="h-10 w-auto" />
              <button
                type="button"
                onClick={() => setMobileMenu(false)}
                className="wire-icon-btn-dark"
                aria-label="Fechar menu"
              >
                <X size={19} />
              </button>
            </div>
            <nav className="space-y-1 p-3">
              {visibleNavigation.map((item) => (
                <ModuleNavLink
                  key={item.to}
                  item={item}
                  collapsed={false}
                  onNavigate={() => setMobileMenu(false)}
                />
              ))}
            </nav>
            <div className="mt-auto border-t border-white/10 p-3">
              <Link to="/dashboard" className="wire-module-switch">
                <ChevronLeft size={17} /> Ordens de Serviço
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="wire-module-switch mt-1 w-full"
              >
                <LogOut size={17} /> Encerrar sessão
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ModuleNavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to === "/leitos" }}
      onClick={onNavigate}
      className="wire-nav-link"
      title={collapsed ? item.label : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function MobileNavItem({
  to,
  label,
  icon: Icon,
  exact = false,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}) {
  return (
    <Link to={to} activeOptions={{ exact }} className="wire-mobile-nav-item">
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
