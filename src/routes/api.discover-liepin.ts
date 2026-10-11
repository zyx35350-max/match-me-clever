import { createFileRoute } from "@tanstack/react-router";
import { createLiepinJobSourceAdapter } from "@/lib/liepin-source-adapter";

export const Route = createFileRoute("/api/discover-liepin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            keywords?: unknown;
            cities?: unknown;
            targetCount?: unknown;
            excludeExternalIds?: unknown;
            excludeSignatures?: unknown;
            refreshJobs?: unknown;
          };
          const keywords = Array.isArray(body.keywords)
            ? body.keywords.filter((value): value is string => typeof value === "string" && value.trim())
            : [];
          const cities = Array.isArray(body.cities)
            ? body.cities.filter((value): value is string => typeof value === "string" && value.trim())
            : [];
          if (!keywords.length) {
            return Response.json({ error: "请至少填写一个猎聘搜索关键词。", sourceId: "liepin" }, { status: 400 });
          }
          const targetCount = typeof body.targetCount === "number" && Number.isFinite(body.targetCount)
            ? Math.max(1, Math.min(100, Math.floor(body.targetCount)))
            : 10;
          const searches = keywords.slice(0, 8).flatMap((keyword) =>
            (cities.length ? cities : [undefined]).map((city) => ({ keyword, city })),
          );
          const refreshJobs = Array.isArray(body.refreshJobs)
            ? body.refreshJobs.flatMap((value) => {
                if (!value || typeof value !== "object") return [];
                const item = value as Record<string, unknown>;
                if (
                  typeof item.externalId !== "string" ||
                  typeof item.sourceUrl !== "string" ||
                  typeof item.rawTitle !== "string" ||
                  typeof item.rawDescription !== "string"
                ) return [];
                const metadata: Record<string, string | number | boolean | null> = {};
                if (item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)) {
                  for (const [key, field] of Object.entries(item.metadata as Record<string, unknown>)) {
                    if (field === null || ["string", "number", "boolean"].includes(typeof field)) {
                      metadata[key] = field as string | number | boolean | null;
                    }
                  }
                }
                return [{
                  externalId: item.externalId,
                  sourceUrl: item.sourceUrl,
                  rawTitle: item.rawTitle,
                  rawDescription: item.rawDescription,
                  ...(typeof item.companyName === "string" ? { companyName: item.companyName } : {}),
                  ...(typeof item.locationText === "string" ? { locationText: item.locationText } : {}),
                  ...(Object.keys(metadata).length ? { metadata } : {}),
                }];
              }).slice(0, 20)
            : [];
          const excludeExternalIds = Array.isArray(body.excludeExternalIds)
            ? body.excludeExternalIds
                .filter((value): value is string => typeof value === "string" && value.trim())
                .slice(0, 10_000)
            : [];
          const excludeSignatures = Array.isArray(body.excludeSignatures)
            ? body.excludeSignatures
                .filter((value): value is string => typeof value === "string" && value.trim())
                .slice(0, 10_000)
            : [];
          const result = await createLiepinJobSourceAdapter().discover({
            searches,
            refreshJobs,
            targetCount,
            maxPagesPerSearch: 10,
            delayMs: 2000,
            headless: false,
            excludeExternalIds,
            excludeSignatures,
          });
          return Response.json({ ...result, requestedTargetCount: targetCount });
        } catch (error) {
          return Response.json({
            error: error instanceof Error ? error.message : "猎聘职位抓取失败。",
            sourceId: "liepin",
          }, { status: 422 });
        }
      },
    },
  },
});
