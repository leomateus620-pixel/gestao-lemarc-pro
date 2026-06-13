import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "gestor" | "colaborador";

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  name: string;
};

const RoleCtx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("gestor");
  const name = role === "gestor" ? "Ricardo Almeida" : "Carlos Henrique";
  return <RoleCtx.Provider value={{ role, setRole, name }}>{children}</RoleCtx.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error("useRole must be inside RoleProvider");
  return ctx;
}
