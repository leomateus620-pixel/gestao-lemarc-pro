/* eslint-disable react-refresh/only-export-components -- Context and hook form one module boundary. */
import { createContext, useContext, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/app/AuthContext";
import { Button } from "@/components/ui/button";
import { useModuleAccessQuery } from "@/hooks/useModuleAccess";
import type { WireTrayModuleAccess } from "@/types/wireTray";

const WireTrayAccessContext = createContext<WireTrayModuleAccess | null>(null);

export function WireTrayAccessProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const query = useModuleAccessQuery(Boolean(user));
  if (query.isLoading) return <WireTrayAccessLoading />;
  if (query.isError) {
    return (
      <WireTrayAccessState
        title="Não foi possível validar o acesso"
        description="A autorização do módulo não pôde ser consultada. Verifique a conexão e tente novamente."
        action={
          <Button type="button" onClick={() => query.refetch()} className="gap-2">
            <RefreshCw size={16} /> Tentar novamente
          </Button>
        }
      />
    );
  }
  const access = query.data?.wireTrays ?? null;
  if (!access) {
    return (
      <WireTrayAccessState
        title="Acesso restrito a Leitos Aramados"
        description="Sua sessão está ativa, mas não existe uma permissão industrial válida para este módulo. Um administrador pode liberar o acesso em Configurações."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/dashboard" className="wire-button-primary">
              Abrir Ordens de Serviço
            </Link>
            <Button type="button" variant="outline" onClick={() => signOut()} className="gap-2">
              <LogOut size={16} /> Encerrar sessão
            </Button>
          </div>
        }
      />
    );
  }
  return <WireTrayAccessContext.Provider value={access}>{children}</WireTrayAccessContext.Provider>;
}

export function useWireTrayAccess() {
  const context = useContext(WireTrayAccessContext);
  if (!context) throw new Error("useWireTrayAccess must be inside WireTrayAccessProvider");
  return context;
}

function WireTrayAccessLoading() {
  return (
    <div className="wire-root grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md space-y-3" aria-label="Validando acesso">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-300" />
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
      </div>
    </div>
  );
}

function WireTrayAccessState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="wire-root grid min-h-dvh place-items-center px-5 py-10">
      <section className="wire-panel w-full max-w-lg p-7 text-center sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-200">
          <LockKeyhole size={24} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-slate-950">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{action}</div>
      </section>
    </div>
  );
}
