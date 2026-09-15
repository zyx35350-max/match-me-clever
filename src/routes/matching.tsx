import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { AICareerProfileCard } from "@/components/ai-career-profile";
import { CareerMatchCard } from "@/components/career-match-card";
import { useCareer } from "@/lib/use-career";
import { useWorkspace } from "@/lib/store";
import type { EmploymentType } from "@/lib/types";

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
  { key: "recommended", label: "Recommended" },
  { key: "growth", label: "High growth value (75+)" },
  { key: "immediate", label: "High immediate fit (75+)" },
  { key: "flagged", label: "Not recommended" },
] as const;

function MatchingPage() {
  const [track, setTrack] = useState<EmploymentType>("fulltime");
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const { matches, aiProfile, refreshAiProfile, topDirection } = useCareer(track);
  const { suggestions, acceptSuggestion, dismissSuggestion } = useWorkspace();

  const visible = matches.filter((m) => {
    if (filter === "recommended") return !m.notRecommended;
    if (filter === "growth") return m.careerGrowthValue >= 75;
    if (filter === "immediate") return m.immediateFit >= 75;
    if (filter === "flagged") return m.notRecommended;
    return true;
  });

  return (
    <AppShell>
      <PageHeading
        eyebrow="AI career matching"
        title="Scored two ways: can you get it, and does it move you forward"
        description={`Weighted: career direction 20%, skill match 20%, relevant experience 15%, growth 15%, AI relevance 10%, transferable skills 8%, preferences 5%, salary 4%, location 3% — minus deal-breaker penalties. Strongest direction right now: ${topDirection?.direction.name ?? "—"}.`}
      />

      {suggestions.length ? (
        <div className="mb-6 rounded-2xl border border-azure/30 bg-azure/8 p-5">
          {suggestions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{s.message}</p>
                <p className="mt-1 text-xs text-ink/60">{s.because}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptSuggestion(s)}
                  className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
                >
                  Yes, update
                </button>
                <button
                  onClick={() => dismissSuggestion(s.id)}
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-card"
                >
                  Keep as is
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-6">
        <AICareerProfileCard aiProfile={aiProfile} onRefresh={refreshAiProfile} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["fulltime", "parttime"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTrack(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              track === t ? "bg-azure text-cream" : "border border-ink/15 hover:bg-sand"
            }`}
          >
            {t === "fulltime" ? "Full-time track" : "Part-time / project track"}
          </button>
        ))}
      </div>
      <p className="mb-5 text-xs text-ink/55">
        {track === "fulltime"
          ? "Full-time weighting favours career fit, growth, industry outlook and skill acquisition over pay."
          : "Part-time weighting: skill acquisition 25%, portfolio value 20%, direction fit 20%, AI relevance 15%, flexibility 10%, income 5%, low commitment 5%."}
      </p>

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
          <CareerMatchCard key={match.job.id} match={match} />
        ))}
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">
            Nothing passes this filter. Loosen it, or adjust your career profile.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
