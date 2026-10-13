import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

type Row = {
  id: string;
  created_at: string;
  stage: string;
  error_code: string;
  duration_ms: number | null;
  online: boolean | null;
  app_version: string | null;
  user_agent: string | null;
  email_masked: string | null;
};

const PERIODS = { "1": 1, "7": 7, "30": 30 } as const;

/** Falhas de login (somente admin; o banco também bloqueia leitura de não-admins). */
export function LoginDiagnosticsLog() {
  const { roles } = useUserRole();
  const isAdmin = roles.includes("admin");
  const [days, setDays] = useState<keyof typeof PERIODS>("7");
  const [email, setEmail] = useState("");
  const { data = [], isLoading } = useQuery<Row[]>({
    queryKey: ["login-diagnostics", days, email],
    enabled: isAdmin,
    queryFn: async () => {
      const since = new Date(Date.now() - PERIODS[days] * 86_400_000).toISOString();
      let query = supabase
        .from("login_diagnostics")
        .select("id, created_at, stage, error_code, duration_ms, online, app_version, user_agent, email_masked")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      const term = email.trim().toLowerCase();
      if (term) query = query.ilike("email_masked", `%${term.replace(/[%_]/g, "")}%`);
      const { data: rows, error } = await query;
      if (error) throw error;
      return rows as Row[];
    },
  });
  if (!isAdmin) return null;

  return (
    <section className="lemarc-wizard-card space-y-4 p-5 sm:p-6">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Acesso</p>
        <h2 className="mt-1 font-display text-2xl font-black text-white">Diagnóstico de login</h2>
        <p className="mt-1 text-sm font-medium text-slate-400">Falhas de entrada dos últimos dias. Sem senhas e com e-mail mascarado.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={days} onChange={(e) => setDays(e.target.value as keyof typeof PERIODS)} className="h-11 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white">
          <option value="1">Últimas 24 horas</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Filtrar e-mail (ex.: lv***)" className="h-11 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="bg-white/[0.05] text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-3 py-3">Data</th><th className="px-3 py-3">E-mail</th><th className="px-3 py-3">Etapa</th><th className="px-3 py-3">Erro</th><th className="px-3 py-3">Duração</th><th className="px-3 py-3">Rede</th><th className="px-3 py-3">Aparelho</th><th className="px-3 py-3">Versão</th></tr></thead>
          <tbody className="divide-y divide-white/[0.07] text-slate-200">
            {isLoading ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Carregando...</td></tr> : data.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">Nenhuma falha registrada.</td></tr> : data.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap px-3 py-3">{new Date(row.created_at).toLocaleString("pt-BR")}</td>
                <td className="px-3 py-3 font-semibold">{row.email_masked ?? "—"}</td>
                <td className="px-3 py-3">{row.stage}</td>
                <td className="px-3 py-3 font-mono text-rose-200">{row.error_code}</td>
                <td className="px-3 py-3 tabular-nums">{row.duration_ms == null ? "—" : `${(row.duration_ms / 1000).toFixed(1)} s`}</td>
                <td className="px-3 py-3">{row.online === false ? "Offline" : "Online"}</td>
                <td className="px-3 py-3">{row.user_agent ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-slate-400">{row.app_version ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
