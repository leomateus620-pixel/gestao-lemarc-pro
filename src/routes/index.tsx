import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasLocalAuthSession } from "@/lib/auth/sessionPolicy";
import { moduleHome, readPreferredModule } from "@/lib/modules";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    // Com sessão salva neste aparelho, abre direto no módulo escolhido;
    // a validação real acontece no gate do módulo.
    if (typeof window !== "undefined" && hasLocalAuthSession()) {
      const module = readPreferredModule();
      if (module) throw redirect({ href: moduleHome[module] });
    }
    throw redirect({ to: "/login" });
  },
});
