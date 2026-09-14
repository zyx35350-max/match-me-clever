import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { MatchRow } from "@/components/match-parts";
import { rankJobs } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/matching")({
  head: () => ({
    meta: [
      { title: "AI Career Matching — Solstice" },
      {
        name: "description",
        content:
          "Score every open role against your weighted skills, salary floor, work-mode preference and target titles, with a plain-language reason for each result.",
      },
      { property: "og:title", content: "AI Career Matching — Solstice" },
      {
        property: "og:description",
        content: "Rank every open role against your profile and see exactly why each one fits.",
      },
    ],
  }),
  component: MatchingPage,
});

const filters = [
  { key: "all", label: "All roles" },
  { key: "high", label: "High fit (85+)" },
  { key: "solid", label: "Solid fit (70+)" },
  { key: "remote", label: "Remote only" },
  { key: "above-floor", label: "Above salary floor" },
] as const;

function MatchingPage() {
  const { profile, jobs } = useWorkspace();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");

  const ranked = useMemo(() => rankJobs(profile, jobs), [profile, jobs]);

  const visible = ranked.filter((m) => {
    if (filter === "high") return m.score >= 85;
    if (filter === "solid") return m.score >= 70;
    if (filter === "remote") return m.job.workMode === "remote";
    if (filter === "above-floor") return m.job.salaryMax >= profile.minSalary;
    return true;
  });

  const avg = Math.round(ranked.reduce((sum, m) => sum + m.score, 0) / (ranked.length || 1));

  return (
    <AppShell>
      <PageHeading
        eyebrow="AI Career Matching"
        title="Every role, scored against your profile"
        description={`Skill overlap is weighted 50%, salary fit 20%, location and work mode 15%, title and level 15%. Average score across ${ranked.length} roles is ${avg}%.`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key ? "bg-ink text-cream" : "border border-ink/15 hover:bg-sand"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((match) => (
          <MatchRow key={match.job.id} match={match} />
        ))}
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">
            No roles pass this filter. Loosen it, or adjust your profile weights.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
