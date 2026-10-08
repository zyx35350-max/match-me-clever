import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { BreakdownGrid, FitBadge, ScoreBar, WhyItFits } from "@/components/match-parts";
import { ExplanationBlock } from "@/components/career-match-card";
import { buildMatchContext } from "@/lib/career-engine";
import { matchRawJobWithUnderstanding } from "@/lib/job-understanding-matcher";
import { formatSalary, labelMode } from "@/lib/matching";
import { statusLabel, useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "职位详情 — Solstice" },
      {
        name: "description",
        content:
          "查看完整岗位信息、匹配评分、技能重合度、薪资、工作方式以及需要注意的差距。",
      },
      { property: "og:title", content: "职位详情 — Solstice" },
      {
        property: "og:description",
        content: "Role details next to your match score breakdown and the gaps to weigh.",
      },
    ],
  }),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const { profile, career, jobs, isSaved, toggleSaved, apply, statusFor, recordFeedback } =
    useWorkspace();
  const job = jobs.find((j) => j.id === jobId);

  if (!job) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-ink/10 bg-card p-8 text-center">
          <h1 className="font-display text-2xl font-bold">找不到这个岗位</h1>
          <p className="mt-2 text-sm text-ink/60">这个岗位已经不在你的工作区中。</p>
          <Link
            to="/matching"
            className="mt-5 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            返回岗位匹配
          </Link>
        </div>
      </AppShell>
    );
  }

  // Same authoritative engine as every list view — one score per job.
  const match = matchRawJobWithUnderstanding(buildMatchContext(career, profile), job);
  const careerMatch = match;
  const status = statusFor(job.id);

  return (
    <AppShell>
      <Link to="/matching" className="text-xs font-semibold text-azure hover:text-azure-deep">
        ← 返回全部匹配岗位
      </Link>

      <div className="mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="rounded-2xl bg-sand p-7">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-extrabold">
                {job.titleOriginal ?? job.title}
              </h1>
              <FitBadge score={match.overall} />
            </div>
            <div className="mt-1 text-sm text-ink/60">
              {job.company} · {job.location} · {labelMode(job.workMode)} ·{" "}
              {formatSalary(job.salaryMin)}–{formatSalary(job.salaryMax)}
            </div>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-ink/75">
              {job.summaryOriginal ?? job.summary}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => apply(job)}
                disabled={Boolean(status)}
                className="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep disabled:opacity-50"
              >
                {status ? statusLabel(status) : "记录申请"}
              </button>
              <button
                onClick={() => toggleSaved(job)}
                className="rounded-xl border border-ink/20 px-5 py-3 font-semibold transition-colors hover:bg-card/60"
              >
                {isSaved(job.id) ? "取消收藏" : "收藏岗位"}
              </button>
              {job.sourceUrl ? (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-azure/30 px-5 py-3 font-semibold text-azure transition-colors hover:bg-azure/8"
                >
                  打开原始招聘页面 ↗
                </a>
              ) : null}
            </div>
          </div>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              AI 岗位评估
            </h2>
            <div className="mb-4 flex flex-wrap gap-6">
              <div>
                <div className="font-display text-3xl font-extrabold text-azure">
                  {careerMatch.immediateFit}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  即时匹配
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-ochre">
                  {careerMatch.careerGrowthValue}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  职业成长价值
                </div>
              </div>
              {careerMatch.notRecommended ? (
                <span className="self-center rounded-full bg-ochre/20 px-2.5 py-1 text-[11px] font-semibold text-ochre">
                  不推荐
                </span>
              ) : null}
            </div>
            <ExplanationBlock match={careerMatch} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => recordFeedback(job, "not_for_me")}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
              >
                不适合我
              </button>
              <button
                onClick={() => recordFeedback(job, "dismissed")}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
              >
                忽略
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              你的匹配分析
            </h2>
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span className="text-ink/60">{match.explanation.recommendation}</span>
                <span className="font-semibold text-azure">{match.overall}%</span>
              </div>
              <ScoreBar value={match.overall} />
            </div>
            <WhyItFits match={match} />
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              岗位职责
            </h2>
            <ul className="space-y-2">
              {job.responsibilities.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-ink/75">
                  <span className="mt-px text-ochre">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="col-span-12 space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              评分构成
            </h2>
            <BreakdownGrid match={match} />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              岗位技能要求
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => {
                const matched = match.matchedSkills.includes(skill);
                return (
                  <span
                    key={skill}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      matched ? "bg-azure/12 text-azure" : "bg-sand text-ink/55"
                    }`}
                  >
                    {skill}
                  </span>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-ink/55">
              Highlighted skills are on your profile. Posted{" "}
              {job.postedDaysAgo === 0 ? "today" : `${job.postedDaysAgo} days ago`}.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
