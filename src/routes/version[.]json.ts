import { createFileRoute } from "@tanstack/react-router";
import { currentBuildId } from "@/lib/app/versionCheck";

export const Route = createFileRoute("/version.json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ buildId: currentBuildId() }), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store, max-age=0",
          },
        }),
    },
  },
});
