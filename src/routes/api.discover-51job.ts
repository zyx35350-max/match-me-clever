import { createFileRoute } from "@tanstack/react-router";
import { createFiftyOneJobSourceAdapter } from "@/lib/51job-source-adapter";

export const Route = createFileRoute("/api/discover-51job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            keywords?: unknown;
            cities?: unknown;
            maxPages?: unknown;
          };

          const keywords = Array.isArray(body.keywords)
            ? body.keywords.filter((value): value is string => typeof value === "string" && value.trim())
            : ["AI产品助理", "AI产品运营"];

          const cities = Array.isArray(body.cities)
            ? body.cities.filter((value): value is string => typeof value === "string" && value.trim())
            : ["040000", "020000"];

          const maxPages =
            typeof body.maxPages === "number" && Number.isFinite(body.maxPages)
              ? Math.max(1, Math.min(3, Math.floor(body.maxPages)))
              : 2;

          const searches = keywords.flatMap((keyword) =>
            cities.map((jobArea) => ({
              keyword,
              jobArea,
              maxPages,
            })),
          );

          const adapter = createFiftyOneJobSourceAdapter();
          const result = await adapter.discover({
            searches,
            maxPagesPerSearch: maxPages,
            delayMs: 1500,
            headless: true,
          });

          return Response.json({
            status: result.status,
            sourceId: result.sourceId,
            fetchedAt: result.fetchedAt,
            jobs: result.jobs,
            message: result.message,
          });
        } catch (error) {
          return Response.json(
            {
              error: error instanceof Error ? error.message : "51Job discovery failed.",
            },
            { status: 422 },
          );
        }
      },
    },
  },
});
