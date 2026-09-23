import { createFileRoute } from "@tanstack/react-router";
import { importJobFromUrl } from "@/lib/job-url-import";

export const Route = createFileRoute("/api/import-job-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: unknown };
          if (typeof body.url !== "string" || !body.url.trim()) {
            return Response.json({ error: "请输入岗位链接。" }, { status: 400 });
          }

          const result = await importJobFromUrl(body.url);
          return Response.json(result);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "无法读取这个岗位链接。" },
            { status: 422 },
          );
        }
      },
    },
  },
});
