import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { parseUserJobText, type UserJobImportResult } from "@/lib/user-job-import";
import { useWorkspace } from "@/lib/store";

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
        title="Paste a real job"
        description="Copy the job listing text from a recruitment site and paste it here. The original wording is preserved; the existing matching engine handles the score."
      />
      <div className="max-w-3xl space-y-5">
        <div className="rounded-2xl border border-ink/10 bg-card p-5">
          <label className="text-sm font-semibold">Job listing</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste the full job posting here…\n\nYou can include title, company, location, responsibilities and requirements."}
            className="mt-3 min-h-[360px] w-full rounded-xl border border-ink/15 bg-cream p-4 text-sm outline-none focus:border-azure"
          />
          <label className="mt-4 block text-sm font-semibold">Job URL (optional)</label>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className="mt-2 w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none focus:border-azure"
          />
          <button
            onClick={submit}
            className="mt-4 rounded-xl bg-azure px-5 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            Import & Analyze
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
              <div><span className="text-ink/45">经验：</span>{result.understanding.semantic.experienceRequirements.join(" · ") || "未识别"}</div>
            </div>
            <div className="mt-4 text-sm">
              <div className="font-semibold">岗位方向</div>
              <div className="mt-1 text-ink/65">{result.understanding.semantic.careerDirections.join(" · ") || "未识别"}</div>
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
