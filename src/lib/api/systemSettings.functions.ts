import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DISPLACEMENT_RATE_KEY = "default_displacement_rate_cents";

export const getDisplacementRateCents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("value")
      .eq("key", DISPLACEMENT_RATE_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = (data as { value?: { cents?: number } } | null)?.value;
    const cents = value?.cents;
    if (typeof cents !== "number" || !Number.isFinite(cents) || cents < 0) return null;
    return Math.round(cents);
  });

export const setDisplacementRateCents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { cents: number }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem alterar esta configuração.");

    const cents = Math.max(0, Math.round(Number(data.cents) || 0));
    const { error } = await context.supabase
      .from("system_settings")
      .upsert(
        {
          key: DISPLACEMENT_RATE_KEY,
          value: { cents },
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { cents };
  });