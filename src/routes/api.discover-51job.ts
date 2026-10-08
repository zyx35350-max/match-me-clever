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
            targetCount?: unknown;
          };

          const keywords = Array.isArray(body.keywords)
            ? body.keywords.filter((value): value is string => typeof value === "string" && value.trim())
            : ["AI产品助理", "AI产品运营"];

          const cities = Array.isArray(body.cities)
            ? body.cities.filter((value): value is string => typeof value === "string" && value.trim())
            : ["040000", "020000"];

          const targetCount =
            typeof body.targetCount === "number" && Number.isFinite(body.targetCount)
              ? Math.max(1, Math.min(500, Math.floor(body.targetCount)))
              : 100;

          const searches = keywords.flatMap((keyword) =>
            cities.map((jobArea) => ({
              keyword,
              jobArea,
            })),
          );

          const adapter = createFiftyOneJobSourceAdapter();
          const result = await adapter.discover({
            searches,
            targetCount,
            maxPagesPerSearch: 50,
            delayMs: 1500,
            detailDelayMs: 1500,
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
