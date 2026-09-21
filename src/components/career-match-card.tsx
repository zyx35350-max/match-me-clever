import { Link } from "@tanstack/react-router";

import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { JobMatch } from "@/lib/career-types";

function DualScore({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "azure" | "ochre";
}) {
  const color = tone === "azure" ? "text-azure" : "text-ochre";
  const bar = tone === "azure" ? "bg-azure" : "bg-ochre";
  return (
    <div className="min-w-[124px] flex-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
          {label}
        </span>
        <span className={`font-display text-lg font-bold ${color}`}>{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ExplanationBlock({ match }: { match: JobMatch }) {
  const e = match.explanation;
  const rows: Array<[string, string[]]> = [
    ["Why this job fits you", e.fits],
    ["What you can bring", e.bring],
    ["What you can learn", e.learn],
    ["Potential concerns", e.concerns],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([title, items]) => (
        <div key={title}>
          <div className="text-[11px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
            {title}
          </div>
          <ul className="mt-1 space-y-1">
            {items.map((item) => (
              <li key={item} className="text-[13px] leading-relaxed text-ink/75">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div>
        <div className="text-[11px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
          Career value
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/75">{e.careerValue}</p>
      </div>
      <div className="rounded-xl bg-sand p-3">
        <div className="text-[11px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
          AI recommendation
        </div>
        <p className="mt-1 text-[13px] font-semibold">{e.recommendation}</p>
        <p className="mt-1 text-[13px] text-ink/65">{e.tradeoff}</p>
      </div>
    </div>
  );
}

export function CareerMatchCard({
  match,
  compact = false,
}: {
  match: JobMatch;
  compact?: boolean;
}) {
  const { job } = match;
  const { isSaved, toggleSaved, apply, recordFeedback, feedbackFor, statusFor } = useWorkspace();
  const feedback = feedbackFor(job.id);
  const applied = Boolean(statusFor(job.id));

  return (
    <div
      className={`rounded-2xl border bg-card p-5 ${
        match.notRecommended ? "border-ochre/40" : "border-ink/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/jobs/$jobId"
              params={{ jobId: job.id }}
              className="font-display font-bold hover:text-azure"
            >
              {job.titleOriginal ?? job.title}
            </Link>
            {job.titleOriginal ? <span className="text-xs text-ink/45">({job.title})</span> : null}
            <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink/60">
              {job.employmentType === "parttime" ? "Part-time" : "Full-time"}
            </span>
            {match.direction ? (
              <span className="rounded-full bg-azure/12 px-2 py-0.5 text-[11px] font-semibold text-azure">
                {match.direction.name}
              </span>
            ) : null}
            {match.notRecommended ? (
              <span className="rounded-full bg-ochre/20 px-2 py-0.5 text-[11px] font-semibold text-ochre">
                Not Recommended
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 text-xs text-ink/55">
            {job.company} · {job.location} ·{" "}
            {job.salaryNote ?? `${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)}`}
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/70">
            {match.explanation.fits[0]}
          </p>
          {compact ? null : (
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink/60">
              {match.explanation.tradeoff}
            </p>
          )}
        </div>
        <div className="flex w-full max-w-[280px] gap-4">
          <DualScore label="Immediate fit" value={match.immediateFit} tone="azure" />
          <DualScore label="Growth value" value={match.careerGrowthValue} tone="ochre" />
        </div>
      </div>

      {match.negatives.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {match.negatives.map((n) => (
            <span
              key={n.tag}
              className="rounded-full bg-ochre/12 px-2 py-0.5 text-[11px] font-semibold text-ochre"
            >
              −{n.penalty} {n.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          onClick={() => recordFeedback(job, "viewed")}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-azure-deep"
        >
          Review
        </Link>
        <button
          onClick={() => {
            toggleSaved(job);
            if (!isSaved(job.id)) recordFeedback(job, "saved");
          }}
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-sand"
        >
          {isSaved(job.id) ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => {
            apply(job);
            recordFeedback(job, "applied");
          }}
          disabled={applied}
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-sand disabled:opacity-50"
        >
          {applied ? "Applied" : "Apply"}
        </button>
        <button
          onClick={() => recordFeedback(job, "not_for_me")}
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/60 transition-colors hover:bg-sand"
        >
          Not for me
        </button>
        {feedback ? (
          <span className="text-[11px] font-semibold text-sage">
            Logged: {feedback.replace("_", " ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
