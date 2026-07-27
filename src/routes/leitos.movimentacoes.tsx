import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { WireTrayMovementsPage } from "@/components/leitos/pages/MiscPages";
import { wireTrayMovementSearchSchema } from "@/lib/wireTrays/schemas";

export const Route = createFileRoute("/leitos/movimentacoes")({
  validateSearch: zodValidator(wireTrayMovementSearchSchema),
  component: MovementsRoute,
});

function MovementsRoute() {
  const search = Route.useSearch();
  return <WireTrayMovementsPage search={search} />;
}
