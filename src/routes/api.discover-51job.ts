import { createFileRoute } from "@tanstack/react-router";
import { createFiftyOneJobSourceAdapter } from "@/lib/51job-source-adapter";

function expandSearchKeywords(keywords: string[]): string[] {
  const expanded = new Set<string>();
  for (const raw of keywords) {
    const keyword = raw.trim();
    if (!keyword) continue;
    expanded.add(keyword);

    // Search engines often treat an "AI + role" phrase as a narrow title.
    // Also search the underlying role and adjacent common title variants.
    const role = keyword.replace(/^(?:AI|AIGC|人工智能)[\s·_-]*/i, "").trim();
    if (role && role !== keyword) expanded.add(role);

    if (/产品运营/.test(role || keyword)) {
      expanded.add("产品运营");
      expanded.add("AI产品运营");
      expanded.add("产品助理");
      expanded.add("AI产品助理");
    } else if (/产品助理/.test(role || keyword)) {
      expanded.add("产品助理");
      expanded.add("产品运营");
      expanded.add("AI产品助理");
    } else if (/运营/.test(role || keyword)) {
      expanded.add("运营");
      expanded.add("产品运营");
      expanded.add("AI运营");
    }
  }
  return [...expanded].slice(0, 16);
}

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

          const expandedKeywords = expandSearchKeywords(keywords);
          const searches = expandedKeywords.flatMap((keyword) =>
            cities.map((jobArea) => ({
              keyword,
              jobArea,
            })),
          );

          const adapter = createFiftyOneJobSourceAdapter();
          const result = await adapter.discover({
            searches,
            // City filtering happens after collection in the UI, so over-fetch
            // to avoid returning only a handful after out-of-city listings are removed.
            targetCount: Math.min(500, targetCount * 4),
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
            requestedTargetCount: targetCount,
            expandedKeywords,
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
