import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { auditActionFor, checkCanManageAccess } from "@/lib/auth/adminAccessGuard";
import { validateNewPassword } from "@/lib/auth/loginInput";

const inputSchema = z.object({
  technicianId: z.string().uuid(),
  password: z.string().max(200).optional(),
  revokeSessions: z.boolean(),
});

/**
 * Redefine a senha e/ou encerra as sessões de um técnico. Só admin, checado no servidor.
 * A senha nunca é gravada nem logada; a auditoria guarda só quem, quando, para quem e a ação.
 */
export const adminManageTechnicianAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const action = auditActionFor(Boolean(data.password), data.revokeSessions);
    if (!action) throw new Error("Nada a fazer.");
    if (data.password) {
      const invalid = validateNewPassword(data.password);
      if (invalid) throw new Error(invalid);
    }

    const { data: actorIsAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error("Não foi possível verificar sua permissão.");
    if (!actorIsAdmin) throw new Error("Apenas administradores podem fazer isso.");

    const { data: tech, error: techError } = await supabase
      .from("technicians")
      .select("user_id")
      .eq("id", data.technicianId)
      .maybeSingle();
    if (techError) throw new Error("Não foi possível carregar o colaborador.");
    const targetUserId = tech?.user_id ?? null;

    let targetIsAdmin = false;
    if (targetUserId) {
      const { data: isAdmin, error } = await supabase.rpc("has_role", {
        _user_id: targetUserId,
        _role: "admin",
      });
      if (error) throw new Error("Não foi possível verificar a conta do colaborador.");
      targetIsAdmin = Boolean(isAdmin);
    }
    const denied = checkCanManageAccess({ actorIsAdmin: true, actorUserId: userId, targetUserId, targetIsAdmin });
    if (denied) throw new Error(denied);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId!, { password: data.password });
      if (error) {
        console.error("[adminManageTechnicianAccess] updateUserById falhou", { code: error.code, status: error.status });
        throw new Error(
          error.code === "weak_password"
            ? "Senha fraca demais. Use outra ou gere uma senha forte."
            : "Não foi possível redefinir a senha.",
        );
      }
    }
    let revoked = 0;
    if (data.revokeSessions) {
      const { data: count, error } = await supabaseAdmin.rpc("admin_revoke_user_sessions", { _user_id: targetUserId! });
      if (error) {
        console.error("[adminManageTechnicianAccess] revogar sessões falhou", { code: error.code });
        throw new Error(data.password ? "Senha redefinida, mas não foi possível desconectar os aparelhos." : "Não foi possível desconectar os aparelhos.");
      }
      revoked = Number(count ?? 0);
    }
    const { error: auditError } = await supabaseAdmin
      .from("admin_password_resets")
      .insert({ actor_user_id: userId, target_user_id: targetUserId!, action });
    if (auditError) console.error("[adminManageTechnicianAccess] auditoria falhou", { code: auditError.code });

    return { ok: true, action, revokedSessions: revoked };
  });
