import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { BreakdownGrid, FitBadge, ScoreBar, WhyItFits } from "@/components/match-parts";
import { ExplanationBlock } from "@/components/career-match-card";
import { matchJob } from "@/lib/career-engine";
import { directionScoreMap } from "@/lib/career-engine";
import { formatSalary, labelMode, scoreJob } from "@/lib/matching";
import { statusLabel, useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({
    meta: [
      { title: "Job Details — Solstice" },
      {
        name: "description",
        content:
          "Full role details next to your match score breakdown: skill overlap, salary fit, work mode and level, plus the gaps to weigh.",
      },
      { property: "og:title", content: "Job Details — Solstice" },
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
          <h1 className="font-display text-2xl font-bold">Role not found</h1>
          <p className="mt-2 text-sm text-ink/60">This listing is no longer in your workspace.</p>
          <Link
            to="/matching"
            className="mt-5 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            Back to matching
          </Link>
        </div>
      </AppShell>
    );
  }

  const match = scoreJob(profile, job);
  const careerMatch = matchJob({ career, profile, directionScores: directionScoreMap(career) }, job);
  const status = statusFor(job.id);

  return (
    <AppShell>
      <Link to="/matching" className="text-xs font-semibold text-azure hover:text-azure-deep">
        ← All matches
      </Link>

      <div className="mt-4 grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="rounded-2xl bg-sand p-7">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-extrabold">{job.titleOriginal ?? job.title}</h1>
              <FitBadge score={match.score} />
            </div>
            <div className="mt-1 text-sm text-ink/60">
              {job.company} · {job.location} · {labelMode(job.workMode)} ·{" "}
              {formatSalary(job.salaryMin)}–{formatSalary(job.salaryMax)}
            </div>
            <p className="mt-4 max-w-2xl text-ink/75">{job.summaryOriginal ?? job.summary}</p>
            {job.summaryOriginal ? (
              <p className="mt-2 max-w-2xl text-sm text-ink/55">{job.summary}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => apply(job)}
                disabled={Boolean(status)}
                className="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep disabled:opacity-50"
              >
                {status ? statusLabel(status) : "Log application"}
              </button>
              <button
                onClick={() => toggleSaved(job)}
                className="rounded-xl border border-ink/20 px-5 py-3 font-semibold transition-colors hover:bg-card/60"
              >
                {isSaved(job.id) ? "Remove from saved" : "Save role"}
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              AI assessment
            </h2>
            <div className="mb-4 flex flex-wrap gap-6">
              <div>
                <div className="font-display text-3xl font-extrabold text-azure">
                  {careerMatch.immediateFit}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">Immediate fit</div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-ochre">
                  {careerMatch.careerGrowthValue}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  Career growth value
                </div>
              </div>
              {careerMatch.notRecommended ? (
                <span className="self-center rounded-full bg-ochre/20 px-2.5 py-1 text-[11px] font-semibold text-ochre">
                  Not Recommended
                </span>
              ) : null}
            </div>
            <ExplanationBlock match={careerMatch} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => recordFeedback(job, "not_for_me")}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
              >
                Not for me
              </button>
              <button
                onClick={() => recordFeedback(job, "dismissed")}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
              >
                Dismiss
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              Profile score breakdown
            </h2>
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs font-medium">
                <span className="text-ink/60">{match.summary}</span>
                <span className="font-semibold text-azure">{match.score}%</span>
              </div>
              <ScoreBar value={match.score} />
            </div>
            <WhyItFits match={match} />
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              What the role involves
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
              Score breakdown
            </h2>
            <BreakdownGrid match={match} />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <h2 className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              Skills listed
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
