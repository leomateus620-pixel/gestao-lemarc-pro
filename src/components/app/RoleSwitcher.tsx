import { useRole } from "./RoleContext";
export function RoleSwitcher() { const { role, setRole } = useRole(); return <button onClick={() => setRole(role === "gestor" ? "colaborador" : "gestor")} className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">{role}</button>; }
