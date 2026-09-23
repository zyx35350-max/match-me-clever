import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { parseUserJobText, type UserJobImportResult } from "@/lib/user-job-import";
import { useWorkspace } from "@/lib/store";
import { primaryCareerDirection } from "@/lib/job-role-direction-mapping";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Job — Solstice" },
      { name: "description", content: "Paste a real job listing and run it through the existing understanding and matching pipeline." },
    ],
  }),
  component: ImportJobPage,
});

function ImportJobPage() {
  const { importRawJob } = useWorkspace();
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "paste">("url");
  const [status, setStatus] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<UserJobImportResult | null>(null);

  function submit() {
    setStatus(null);
    setWarnings([]);
    setResult(null);
    try {
      const parsed = parseUserJobText({ text, sourceUrl });
      const stored = importRawJob(parsed.raw);
      setWarnings(stored.warnings);
      setResult(parsed);
      setStatus(
        stored.added
          ? "导入成功。岗位已经进入 Matching，可以继续查看匹配结果。"
          : "这个岗位已经导入过了，本次没有重复添加。",
      );
      if (stored.added) setText("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not import this job.");
    }
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="User import"
        title="Import a real job"
        description="Paste a job URL when possible. Solstice will try to read the page automatically; if the site blocks automated access, switch to paste mode."
      />
      <div className="max-w-3xl space-y-5">
        <div className="rounded-2xl border border-ink/10 bg-card p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${inputMode === "url" ? "bg-azure text-cream" : "bg-cream text-ink/60"}`}
            >
              Job URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${inputMode === "paste" ? "bg-azure text-cream" : "bg-cream text-ink/60"}`}
            >
              Paste text
            </button>
          </div>

          {inputMode === "url" ? (
            <div className="mt-4">
              <label className="text-sm font-semibold">Job URL</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none focus:border-azure"
              />
              <p className="mt-2 text-xs text-ink/50">
                Solstice reads the public page on the server and preserves the original source URL.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-sm font-semibold">Job listing</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Paste the full job posting here…\n\nUse this fallback when a recruitment site blocks automatic reading."}
                className="mt-3 min-h-[360px] w-full rounded-xl border border-ink/15 bg-cream p-4 text-sm outline-none focus:border-azure"
              />
              <label className="mt-4 block text-sm font-semibold">Job URL (optional)</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none focus:border-azure"
              />
            </div>
          )}

          <button
            onClick={async () => {
              if (inputMode === "paste") {
                submit();
                return;
              }
              setStatus(null);
              setWarnings([]);
              setResult(null);
              try {
                const response = await fetch("/api/import-job-url", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ url: sourceUrl }),
                });
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error ?? "无法读取这个岗位链接。");
                const stored = importRawJob(payload.raw);
                setWarnings(stored.warnings);
                setResult(payload);
                setStatus("链接读取成功，岗位已经进入 Matching。");
              } catch (error) {
                setStatus(error instanceof Error ? error.message : "无法读取这个岗位链接。");
              }
            }}
            className="mt-4 rounded-xl bg-azure px-5 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            {inputMode === "url" ? "Read URL & Analyze" : "Import & Analyze"}
          </button>
        </div>
        {status ? <div className="rounded-xl border border-ink/10 bg-card p-4 text-sm">{status}</div> : null}
        {result ? (
          <div className="rounded-2xl border border-ink/10 bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">Parsed job</div>
            <h2 className="mt-2 text-xl font-semibold">{result.job.title}</h2>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><span className="text-ink/45">公司：</span>{result.job.company}</div>
              <div><span className="text-ink/45">地点：</span>{result.job.location}</div>
              <div><span className="text-ink/45">薪资：</span>{result.job.salaryNote ?? "未识别"}</div>
              <div><span className="text-ink/45">语言：</span>{result.understanding.language}</div>
              <div><span className="text-ink/45">英语要求：</span>{result.understanding.semantic.englishRequirement}</div>
              <div><span className="text-ink/45">英语等级：</span>{result.understanding.semantic.englishProficiency === "unknown" ? "未识别" : result.understanding.semantic.englishProficiency}</div>
              <div><span className="text-ink/45">经验：</span>{(result.understanding.semantic.experienceRequirements ?? []).join(" · ") || "未识别"}</div>
              <div><span className="text-ink/45">职位类型：</span>{result.understanding.semantic.jobRole === "unknown" ? "未识别" : result.understanding.semantic.jobRole}</div>
            </div>
            <div className="mt-4 text-sm">
              <div className="font-semibold">岗位方向</div>
              <div className="mt-1 text-ink/65">{primaryCareerDirection(result.understanding.semantic.jobRole, result.understanding.semantic) ?? "未识别"}</div>
            </div>
          </div>
        ) : null}

        {warnings.length ? (
          <div className="rounded-xl border border-ochre/30 bg-ochre/10 p-4 text-sm">
            <div className="font-semibold">Missing data detected</div>
            <ul className="mt-2 list-disc pl-5 text-ink/65">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
            <p className="mt-2 text-xs text-ink/50">These are warnings only. The system does not invent missing job facts.</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
