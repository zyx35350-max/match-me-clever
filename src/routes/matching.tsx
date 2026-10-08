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
  { key: "new", label: "New this sync" },
  { key: "recommended", label: "Recommended" },
  { key: "growth", label: "High growth value (75+)" },
  { key: "immediate", label: "High immediate fit (75+)" },
  { key: "flagged", label: "Not recommended" },
] as const;

function MatchingPage() {
  const [track, setTrack] = useState<EmploymentType>("fulltime");
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
  const { matches, aiProfile, refreshAiProfile, topDirection } = useCareer(track);
  const {
    suggestions,
    acceptSuggestion,
    dismissSuggestion,
    importDiscoveredJobs,
    discovery,
  } = useWorkspace();
  const [discovering, setDiscovering] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("AI产品经理, AI产品助理");
  const [selectedCities, setSelectedCities] = useState<string[]>(["040000", "020000"]);
  const [targetCount, setTargetCount] = useState(100);

  const cities = [
    { code: "040000", label: "Shenzhen" },
    { code: "020000", label: "Shanghai" },
  ];

  async function discover51Job() {
    const keywords = keywordInput
      .split(/[，,、\\n]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!keywords.length) {
      setDiscoveryMessage("Enter at least one keyword.");
      return;
    }
    if (!selectedCities.length) {
      setDiscoveryMessage("Select at least one city.");
      return;
    }

    setDiscovering(true);
    setDiscoveryMessage(null);
    try {
      const response = await fetch("/api/discover-51job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keywords,
          cities: selectedCities,
          targetCount,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "51Job discovery failed.");
      const summary = importDiscoveredJobs(payload.jobs ?? [], "51Job");
      setDiscoveryMessage(
        "Fetched " +
          summary.fetched +
          " jobs · " +
          summary.added +
          " new · " +
          summary.updated +
          " updated · " +
          summary.duplicates +
          " duplicates",
      );
    } catch (error) {
      setDiscoveryMessage(error instanceof Error ? error.message : "51Job discovery failed.");
    } finally {
      setDiscovering(false);
    }
  }

  const visible = matches.filter((m) => {
    if (filter === "new") return discovery.lastAddedJobIds.includes(m.job.id);
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

      <div className="mb-6 rounded-2xl border border-ink/10 bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              Live discovery
            </div>
            <div className="mt-1 text-sm font-semibold">51Job · Custom search</div>
            <p className="mt-1 text-xs text-ink/55">
              Enter the roles you actually want to test. 51Job pages are followed automatically,
              duplicates are removed, and each job URL is opened to fetch the full JD.
            </p>
          </div>
          <button
            onClick={discover51Job}
            disabled={discovering}
            className="rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep disabled:opacity-50"
          >
            {discovering ? "Discovering…" : "Search 51Job"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">Keywords</span>
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="e.g. AI产品经理, AI产品助理, AI应用产品"
              className="w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-azure"
            />
            <span className="mt-1.5 block text-[11px] text-ink/45">
              Separate multiple keywords with commas.
            </span>
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">Cities</span>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => {
                const checked = selectedCities.includes(city.code);
                return (
                  <button
                    key={city.code}
                    type="button"
                    onClick={() =>
                      setSelectedCities((current) =>
                        checked
                          ? current.filter((code) => code !== city.code)
                          : [...current, city.code],
                      )
                    }
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      checked ? "bg-ink text-cream" : "border border-ink/15 hover:bg-sand"
                    }`}
                  >
                    {city.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">Jobs to collect</span>
            <select
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-azure"
            >
              {[50, 100, 200, 300, 500].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block text-[11px] text-ink/45">The crawler keeps turning pages until it reaches this target or the source has no more usable jobs.</span>
          </label>
        </div>

        {discovery.lastSyncedAt ? (
          <p className="mt-3 text-[11px] text-ink/45">
            Last sync: {new Date(discovery.lastSyncedAt).toLocaleString()}
          </p>
        ) : null}
        {discoveryMessage ? (
          <div className="mt-4 rounded-xl bg-sand px-4 py-3 text-xs text-ink/70">
            {discoveryMessage}
          </div>
        ) : null}
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
