import { createFileRoute } from "@tanstack/react-router";
import { importJobFromUrl, JobUrlImportError } from "@/lib/job-url-import";
import { detectJobPlatform } from "@/lib/job-platform";

export const Route = createFileRoute("/api/import-job-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: unknown };
        try {
          body = (await request.json()) as { url?: unknown };
        } catch {
          return Response.json({ error: "请求内容无效。" }, { status: 400 });
        }

        if (typeof body.url !== "string" || !body.url.trim()) {
          return Response.json({ error: "请粘贴岗位链接。" }, { status: 400 });
        }

        const platform = detectJobPlatform(body.url);
        try {
          const result = await importJobFromUrl(body.url);
          return Response.json({ ...result, platform: result.platform });
        } catch (error) {
          if (error instanceof JobUrlImportError) {
            return Response.json(
              { error: error.message, code: error.code, platform: error.platform ?? platform },
              { status: error.httpStatus },
            );
          }
          return Response.json(
            { error: error instanceof Error ? error.message : "无法读取这个岗位链接。", platform },
            { status: 422 },
          );
        }
      },
    },
  },
});
