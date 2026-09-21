import { Link } from "@tanstack/react-router";

import { fitLabel, formatSalary, labelMode } from "@/lib/matching";
import { statusLabel, useWorkspace } from "@/lib/store";
import type { JobMatch } from "@/lib/career-types";

export function ScoreBar({
  value,
  tone = "azure",
}: {
  value: number;
  tone?: "azure" | "ochre" | "sage";
}) {
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

export function MatchRow({ match }: { match: JobMatch }) {
  const { job, overall } = match;
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
            {job.titleOriginal ?? job.title}
          </Link>
          <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink/60">
            {labelMode(job.workMode)}
          </span>
          {match.notRecommended ? (
            <span className="rounded-full bg-ochre/20 px-2 py-0.5 text-[11px] font-semibold text-ochre">
              Not Recommended
            </span>
          ) : null}
          {status ? (
            <span className="rounded-full bg-azure/12 px-2 py-0.5 text-[11px] font-semibold text-azure">
              {statusLabel(status)}
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
      </div>
      <div className="w-32">
        <div className="flex justify-end gap-3 text-right">
          <div>
            <div className="font-display text-lg font-bold text-azure">{match.immediateFit}</div>
            <div className="text-[10px] tracking-[0.12em] text-ink/50 uppercase">Fit</div>
          </div>
          <div>
            <div className="font-display text-lg font-bold text-ochre">
              {match.careerGrowthValue}
            </div>
            <div className="text-[10px] tracking-[0.12em] text-ink/50 uppercase">Growth</div>
          </div>
        </div>
        <div className="mt-1">
          <ScoreBar value={overall} />
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

export function WhyItFits({ match }: { match: JobMatch }) {
  return (
    <div className="space-y-2">
      {match.explanation.fits.map((reason) => (
        <div key={reason} className="flex gap-2 text-[13px] leading-relaxed text-ink/75">
          <span className="mt-px font-semibold text-azure">+</span>
          <span>{reason}</span>
        </div>
      ))}
      {match.explanation.concerns.map((gap) => (
        <div key={gap} className="flex gap-2 text-[13px] leading-relaxed text-ink/60">
          <span className="mt-px font-semibold text-ochre">−</span>
          <span>{gap}</span>
        </div>
      ))}
    </div>
  );
}

/** The nine weighted components of the authoritative match model. */
export function BreakdownGrid({ match }: { match: JobMatch }) {
  const b = match.breakdown;
  const rows: Array<[string, number, "azure" | "ochre" | "sage"]> = [
    ["Career direction fit (20%)", b.directionFit, "ochre"],
    ["Skill match (20%)", b.skillMatch, "azure"],
    ["Relevant experience (15%)", b.relevantExperience, "sage"],
    ["Growth potential (15%)", b.growthPotential, "ochre"],
    ["AI relevance (10%)", b.aiRelevance, "azure"],
    ["Transferable skills (8%)", b.transferableSkills, "sage"],
    ["Work preference (5%)", b.workPreference, "azure"],
    ["Salary (4%)", b.salary, "ochre"],
    ["Location / work mode (3%)", b.location, "sage"],
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
      {match.negatives.length ? (
        <div className="pt-1 text-xs text-ochre">
          {match.negatives.map((n) => `−${n.penalty} ${n.label}`).join(" · ")}
        </div>
      ) : null}
      <p className="pt-1 text-[11px] text-ink/45">AI assessment, not an exact measurement.</p>
    </div>
  );
}
