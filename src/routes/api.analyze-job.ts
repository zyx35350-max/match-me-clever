import { createFileRoute } from "@tanstack/react-router";
import { analyzeUserJobText } from "@/lib/ai-job-pipeline";

export const Route = createFileRoute("/api/analyze-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            text?: unknown;
            sourceUrl?: unknown;
            companyName?: unknown;
            locationText?: unknown;
          };

          if (typeof body.text !== "string" || !body.text.trim()) {
            return Response.json({ error: "请输入岗位文本。" }, { status: 400 });
          }

          const result = await analyzeUserJobText({
            text: body.text,
            ...(typeof body.sourceUrl === "string" ? { sourceUrl: body.sourceUrl } : {}),
            ...(typeof body.companyName === "string" ? { companyName: body.companyName } : {}),
            ...(typeof body.locationText === "string" ? { locationText: body.locationText } : {}),
          });

          return Response.json(result);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "岗位分析失败。" },
            { status: 422 },
          );
        }
      },
    },
  },
});
