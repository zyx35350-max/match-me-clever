import { Link } from "@tanstack/react-router";

import { fitLabel, formatSalary, labelMode } from "@/lib/matching";
import { statusLabel, useWorkspace } from "@/lib/store";
import type { MatchResult } from "@/lib/types";

export function ScoreBar({ value, tone = "azure" }: { value: number; tone?: "azure" | "ochre" | "sage" }) {
  const bg = tone === "ochre" ? "bg-ochre" : tone === "sage" ? "bg-sage" : "bg-azure";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-sand">
      <div className={`score-bar h-full rounded-full ${bg}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function FitBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "bg-sage/20 text-sage"
      : score >= 70
        ? "bg-azure/12 text-azure"
        : "bg-sand text-ink/60";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {fitLabel(score)}
    </span>
  );
}

export function MatchRow({ match }: { match: MatchResult }) {
  const { job, score } = match;
  const { isSaved, toggleSaved, statusFor } = useWorkspace();
  const status = statusFor(job.id);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink/10 bg-card p-5">
      <div className="min-w-[220px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/jobs/$jobId"
            params={{ jobId: job.id }}
            className="font-display font-bold hover:text-azure"
          >
            {job.title}
          </Link>
          <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink/60">
            {labelMode(job.workMode)}
          </span>
          {status ? (
            <span className="rounded-full bg-azure/12 px-2 py-0.5 text-[11px] font-semibold text-azure">
              {statusLabel(status)}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-xs text-ink/55">
          {job.company} · {job.location} · {formatSalary(job.salaryMin)}–
          {formatSalary(job.salaryMax)}
        </div>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink/70">{match.reasons[0]}</p>
      </div>
      <div className="w-28">
        <div className="text-right font-display text-lg font-bold text-azure">{score}%</div>
        <div className="mt-1">
          <ScoreBar value={score} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => toggleSaved(job)}
          className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-sand"
        >
          {isSaved(job.id) ? "Saved" : "Save"}
        </button>
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-cream transition-colors hover:bg-azure-deep"
        >
          Details
        </Link>
      </div>
    </div>
  );
}

export function WhyItFits({ match }: { match: MatchResult }) {
  return (
    <div className="space-y-2">
      {match.reasons.map((reason) => (
        <div key={reason} className="flex gap-2 text-[13px] leading-relaxed text-ink/75">
          <span className="mt-px font-semibold text-azure">+</span>
          <span>{reason}</span>
        </div>
      ))}
      {match.gaps.map((gap) => (
        <div key={gap} className="flex gap-2 text-[13px] leading-relaxed text-ink/60">
          <span className="mt-px font-semibold text-ochre">−</span>
          <span>{gap}</span>
        </div>
      ))}
    </div>
  );
}

export function BreakdownGrid({ match }: { match: MatchResult }) {
  const rows: Array<[string, number, "azure" | "ochre" | "sage"]> = [
    ["Skill overlap (50%)", match.breakdown.skills, "ochre"],
    ["Salary fit (20%)", match.breakdown.salary, "azure"],
    ["Location & mode (15%)", match.breakdown.location, "sage"],
    ["Title & level (15%)", match.breakdown.title, "azure"],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([label, value, tone]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-xs font-medium">
            <span className="text-ink/60">{label}</span>
            <span className="font-semibold text-azure">{value}%</span>
          </div>
          <ScoreBar value={value} tone={tone} />
        </div>
      ))}
    </div>
  );
}
