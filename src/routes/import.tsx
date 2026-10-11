import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { parseUserJobText, type UserJobImportResult } from "@/lib/user-job-import";
import { useWorkspace } from "@/lib/store";
import { primaryCareerDirection } from "@/lib/job-role-direction-mapping";
import { detectJobPlatform } from "@/lib/job-platform";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "导入岗位 — Solstice" },
      { name: "description", content: "粘贴真实岗位信息，通过现有的岗位理解与匹配流程进行分析。" },
    ],
  }),
  component: ImportJobPage,
});

function ImportJobPage() {
  const { importRawJob } = useWorkspace();
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const detectedPlatform = detectJobPlatform(sourceUrl);
  const [inputMode, setInputMode] = useState<"url" | "paste">("url");
  const [status, setStatus] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [result, setResult] = useState<UserJobImportResult | null>(null);
  const [analysisSource, setAnalysisSource] = useState<"gemini" | "deterministic" | null>(null);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);

  async function importFromUrl(url: string) {
    setStatus(null);
    setWarnings([]);
    setResult(null);
    try {
      const response = await fetch("/api/import-job-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const platformName = payload.platform?.name ?? detectJobPlatform(url)?.name;
        throw new Error(platformName ? `${platformName}链接已识别。 ${payload.error ?? "网页暂时无法读取。"}` : payload.error ?? "无法读取这个岗位链接。");
      }
      const stored = importRawJob(payload.raw);
      setWarnings(stored.warnings);
      setResult(payload);
      setAnalysisSource(payload.analysisSource ?? "deterministic");
      setAnalysisWarning(payload.analysisWarning ?? null);
      setStatus(`${payload.platform?.name ? `已识别为${payload.platform.name}。` : "链接读取成功。"}岗位已进入岗位匹配。`);
    } catch (error) {
      setAnalysisSource(null);
      setAnalysisWarning(null);
      setStatus(error instanceof Error ? error.message : "无法读取这个岗位链接。");
    }
  }

  async function submit() {
    setStatus(null);
    setWarnings([]);
    setResult(null);
    setAnalysisSource(null);
    setAnalysisWarning(null);
    try {
      const parsed = parseUserJobText({ text, sourceUrl });
      const stored = importRawJob(parsed.raw);
      setWarnings(stored.warnings);
      setResult(parsed);
      setStatus(
        stored.added
          ? "导入成功。岗位已经进入岗位匹配，可以继续查看匹配结果。"
          : "这个岗位已经导入过了，本次没有重复添加。",
      );
      if (stored.added) setText("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "无法导入这个岗位。");
    }
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="User import"
        title="导入真实岗位信息"
        description="优先粘贴岗位链接，Solstice 会尝试读取页面；如果网站限制自动读取，请切换到粘贴文本。"
      />
      <div className="max-w-3xl space-y-5">
        {analysisSource ? (
          <div className="rounded-xl border border-ink/10 bg-card p-4 text-sm">
            <span className="font-semibold">理解引擎：</span>
            {analysisSource === "gemini" ? "Gemini AI 结构化理解" : "规则解析回退"}
            {analysisWarning ? <div className="mt-2 text-xs text-ochre">{analysisWarning}</div> : null}
          </div>
        ) : null}
        <div className="rounded-2xl border border-ink/10 bg-card p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${inputMode === "url" ? "bg-azure text-cream" : "bg-cream text-ink/60"}`}
            >
              岗位链接
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
              <label className="text-sm font-semibold">岗位链接</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none focus:border-azure"
              />
              <div className="mt-2 text-xs text-ink/55" role="status" aria-live="polite">
                {detectedPlatform ? `已识别岗位平台：${detectedPlatform.name}` : sourceUrl.trim() ? "暂未识别为支持的招聘平台；仍会尝试读取公开网页。" : "支持 BOSS直聘、前程无忧、智联招聘、猎聘和拉勾链接。"}
              </div>
              <p className="mt-1 text-xs text-ink/45">平台识别不代表平台允许自动读取；遇到登录或访问验证时，可切换到粘贴职位全文。</p>
            </div>
          ) : (
            <div className="mt-4">
              <label className="text-sm font-semibold">岗位描述</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"请粘贴完整的岗位信息…\n\n如果招聘网站限制自动读取，请在这里粘贴岗位全文。"}
                className="mt-3 min-h-[360px] w-full rounded-xl border border-ink/15 bg-cream p-4 text-sm outline-none focus:border-azure"
              />
              <label className="mt-4 block text-sm font-semibold">岗位链接（选填）</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://…"
                className="mt-2 w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none focus:border-azure"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (inputMode === "paste") {
                submit();
                return;
              }
              void importFromUrl(sourceUrl);
            }}
            className="mt-4 rounded-xl bg-azure px-5 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            {inputMode === "url" ? "读取链接并分析" : "导入并分析"}
          </button>
        </div>
        {status ? <div className="rounded-xl border border-ink/10 bg-card p-4 text-sm">{status}</div> : null}
        {result ? (
          <div className="rounded-2xl border border-ink/10 bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">岗位识别结果</div>
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
            <div className="font-semibold">以下岗位信息尚未识别</div>
            <ul className="mt-2 list-disc pl-5 text-ink/65">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
            <p className="mt-2 text-xs text-ink/50">这些只是提醒，系统不会编造缺失的岗位信息。</p>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
