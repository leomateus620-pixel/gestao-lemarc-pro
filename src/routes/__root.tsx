import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="blueprint-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-sm rounded-2xl p-8 text-center">
        <h1 className="font-display text-6xl font-black text-primary">404</h1>
        <h2 className="mt-3 text-lg font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A rota que você tentou acessar não existe.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="blueprint-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-sm rounded-2xl p-8 text-center">
        <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#1a2238" },
      { title: "Gestão Lemarc — Ordens de Serviço Industriais" },
      {
        name: "description",
        content: "Plataforma de gestão de ordens de serviço da Lemarc Industrial.",
      },
      { property: "og:title", content: "Gestão Lemarc — Ordens de Serviço Industriais" },
      {
        property: "og:description",
        content: "Plataforma de gestão de ordens de serviço da Lemarc Industrial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Gestão Lemarc — Ordens de Serviço Industriais" },
      {
        name: "twitter:description",
        content: "Plataforma de gestão de ordens de serviço da Lemarc Industrial.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/25a52341-c79e-4a82-a3eb-efa44f11b933/id-preview-682ab43e--3e87f42c-8a40-47f0-aab9-96fb71e5e78e.lovable.app-1781377709076.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/25a52341-c79e-4a82-a3eb-efa44f11b933/id-preview-682ab43e--3e87f42c-8a40-47f0-aab9-96fb71e5e78e.lovable.app-1781377709076.png",
      },
      { name: "description", content: "Gestão de ordens de serviço." },
      { property: "og:description", content: "Gestão de ordens de serviço." },
      { name: "twitter:description", content: "Gestão de ordens de serviço." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/47b6e543-520c-44be-8df1-fe1557294730/id-preview-c29a14c9--3e87f42c-8a40-47f0-aab9-96fb71e5e78e.lovable.app-1782127156924.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/47b6e543-520c-44be-8df1-fe1557294730/id-preview-c29a14c9--3e87f42c-8a40-47f0-aab9-96fb71e5e78e.lovable.app-1782127156924.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
