import { Link } from "@tanstack/react-router";

import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { JobMatch } from "@/lib/career-types";

function DualScore({ label, value, tone }: { label: string; value: number; tone: "azure" | "ochre" }) {
  const color = tone === "azure" ? "text-azure" : "text-ochre";
  return (
    <div className="min-w-[72px] text-center">
      <div className={`${'font-display text-lg font-bold ' + color}`}>{value}</div>
      <div className="text-[9px] font-semibold tracking-[0.12em] text-ink/40 uppercase">{label}</div>
    </div>
  );
}

export function ExplanationBlock({ match }: { match: JobMatch }) {
  const e = match.explanation;
  return (
    <div className="space-y-3">
      {[
        ["为什么这个岗位适合你", e.fits],
        ["你能带来的能力", e.bring],
        ["可以学到什么", e.learn],
        ["需要注意的问题", e.concerns],
      ].map(([title, items]) => {
        const list = items as string[];
        if (!list.length) return null;
        return (
          <div key={title as string}>
            <div className="text-[10px] font-semibold tracking-[0.14em] text-ink/45 uppercase">{title as string}</div>
            <ul className="mt-1 space-y-1">{list.map((item) => <li key={item} className="text-[13px] leading-relaxed text-ink/70">{item}</li>)}</ul>
          </div>
        );
      })}
      <div>
        <div className="text-[10px] font-semibold tracking-[0.14em] text-ink/45 uppercase">Career value</div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/70">{e.careerValue}</p>
      </div>
      <div className="rounded-xl bg-sand p-3">
        <div className="text-[10px] font-semibold tracking-[0.14em] text-ink/45 uppercase">AI recommendation</div>
        <p className="mt-1 text-[13px] font-semibold">{e.recommendation}</p>
        <p className="mt-1 text-[12px] text-ink/60">{e.tradeoff}</p>
      </div>
    </div>
  );
}

export function CareerMatchCard({ match, compact = false }: { match: JobMatch; compact?: boolean }) {
  const { job } = match;
  const { isSaved, toggleSaved, apply, recordFeedback, feedbackFor, statusFor, hideJob } = useWorkspace();
  const feedback = feedbackFor(job.id);
  const applied = Boolean(statusFor(job.id));

  return (
    <div className={`${"rounded-xl border bg-card px-4 py-3.5 " + (match.notRecommended ? "border-ochre/35" : "border-ink/10")}`}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="truncate font-display text-sm font-bold hover:text-azure">
              {job.titleOriginal ?? job.title}
            </Link>
            {job.titleOriginal ? <span className="hidden text-[11px] text-ink/35 xl:inline">({job.title})</span> : null}
            {match.direction ? <span className="rounded-full bg-azure/10 px-2 py-0.5 text-[10px] font-semibold text-azure">{match.direction.name}</span> : null}
            {match.notRecommended ? <span className="rounded-full bg-ochre/15 px-2 py-0.5 text-[10px] font-semibold text-ochre">Not recommended</span> : null}
            {statusFor(job.id) ? <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-semibold text-ink/50">{statusFor(job.id)}</span> : null}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-ink/50">
            {job.company} · {job.location} · {job.salaryNote ?? formatSalary(job.salaryMin) + "–" + formatSalary(job.salaryMax)}
          </div>
          <p className="mt-1 line-clamp-2 max-w-3xl text-[12px] leading-relaxed text-ink/60">
            {match.explanation.fits[0]}
            {!compact && match.explanation.tradeoff ? " " + match.explanation.tradeoff : ""}
          </p>
          {match.negatives.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {match.negatives.slice(0, 3).map((n) => (
                <span key={n.tag} className="rounded-full bg-ochre/10 px-1.5 py-0.5 text-[10px] font-semibold text-ochre">
                  −{n.penalty} {n.label}
                </span>
              ))}
              {match.negatives.length > 3 ? <span className="text-[10px] text-ink/35">+{match.negatives.length - 3} more</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
          <div className="flex items-center gap-2">
            <DualScore label="Fit" value={match.immediateFit} tone="azure" />
            <DualScore label="Growth" value={match.careerGrowthValue} tone="ochre" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to="/jobs/$jobId" params={{ jobId: job.id }} onClick={() => recordFeedback(job, "viewed")} className="rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-semibold text-cream hover:bg-azure-deep">Review</Link>
            <button onClick={() => hideJob(job.id)} className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-[11px] font-semibold text-ink/55 hover:bg-sand">Hide</button>
            <button onClick={() => { toggleSaved(job); if (!isSaved(job.id)) recordFeedback(job, "saved"); }} className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-sand">
              {isSaved(job.id) ? "已收藏" : "收藏"}
            </button>
            <button onClick={() => { apply(job); recordFeedback(job, "applied"); }} disabled={applied} className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-sand disabled:opacity-45">
              {applied ? "已申请" : "申请"}
            </button>
          </div>
        </div>
      </div>
      {feedback ? <div className="mt-1.5 text-[10px] font-semibold text-sage">Logged: {feedback.replace("_", " ")}</div> : null}
    </div>
  );
}
