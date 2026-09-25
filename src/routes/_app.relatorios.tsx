import { createFileRoute, Outlet } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { reportSearchSchema } from "@/lib/reports/filters";

export const Route = createFileRoute("/_app/relatorios")({
  validateSearch: zodValidator(reportSearchSchema),
  component: () => <Outlet />,
});
