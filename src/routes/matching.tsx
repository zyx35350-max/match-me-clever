import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { AICareerProfileCard } from "@/components/ai-career-profile";
import { CareerMatchCard } from "@/components/career-match-card";
import { useCareer } from "@/lib/use-career";
import { useWorkspace } from "@/lib/store";
import type { EmploymentType } from "@/lib/types";
import { canonical51JobArea, isJobInSelectedCities } from "@/lib/job-search-preferences";

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
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { matches, aiProfile, refreshAiProfile, topDirection } = useCareer(track);
  const { suggestions, acceptSuggestion, dismissSuggestion, importDiscoveredJobs, discovery, searchCities, importedJobRecords } = useWorkspace();
  const [discovering, setDiscovering] = useState(false);
  const [discoveringLiepin, setDiscoveringLiepin] = useState(false);
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);
  const [liepinDiscoveryMessage, setLiepinDiscoveryMessage] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState("AI产品经理, AI产品助理");
  const [selectedCities, setSelectedCities] = useState<string[]>(() => searchCities.map((city) => city.id));
  const [targetCountInput, setTargetCountInput] = useState("10");

  useEffect(() => {
    const availableIds = new Set(searchCities.map((city) => city.id));
    setSelectedCities((current) => current.filter((id) => availableIds.has(id)));
  }, [searchCities]);

  useEffect(() => setPage(1), [filter, track]);

  async function discover51Job() {
    const keywords = keywordInput.split(/[，,、\n]+/).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 8);
    if (!keywords.length) return setDiscoveryMessage("Enter at least one keyword.");
    if (!selectedCities.length) return setDiscoveryMessage("Select at least one city.");
    const targetCount = Number.parseInt(targetCountInput, 10);
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 500) {
      return setDiscoveryMessage("Jobs to collect must be a whole number from 1 to 500.");
    }
    setDiscovering(true);
    setDiscoveryMessage(null);
    try {
      const response = await fetch("/api/discover-51job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keywords, cities: searchCities.filter((city) => selectedCities.includes(city.id)).map(canonical51JobArea), targetCount }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "51Job discovery failed.");
      const selectedCityPreferences = searchCities.filter((city) => selectedCities.includes(city.id));
      const fetchedJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
      const cityMatchedJobs = fetchedJobs.filter((job) =>
        isJobInSelectedCities(job.locationText, selectedCityPreferences),
      );
      const rejectedByCity = fetchedJobs.length - cityMatchedJobs.length;
      const summary = importDiscoveredJobs(cityMatchedJobs, "51Job");
      const sourceReport = typeof payload.message === "string" && payload.message.trim()
        ? "。抓取日志：" + payload.message
        : "";
      setDiscoveryMessage("抓取 " + fetchedJobs.length + " 个 · 实际地点不符排除 " + rejectedByCity +
        " 个 · 新增 " + summary.added + " 个 · 更新 " + summary.updated + " 个 · 重复 " + summary.duplicates + sourceReport);
    } catch (error) {
      setDiscoveryMessage(error instanceof Error ? error.message : "51Job discovery failed.");
    } finally {
      setDiscovering(false);
    }
  }

  async function discoverLiepin() {
    const keywords = keywordInput.split(/[，,、\n]+/).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 8);
    if (!keywords.length) return setLiepinDiscoveryMessage("Enter at least one keyword.");
    if (!selectedCities.length) return setLiepinDiscoveryMessage("Select at least one city.");
    const targetCount = Number.parseInt(targetCountInput, 10);
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 100) {
      return setLiepinDiscoveryMessage("Liepin collection is limited to 100 jobs per run.");
    }
    setDiscoveringLiepin(true);
    setLiepinDiscoveryMessage(null);
    try {
      const cities = searchCities.filter((city) => selectedCities.includes(city.id)).map((city) => city.name);
      const existingLiepinIds = importedJobRecords
        .filter((record) => record.raw.sourceId === "liepin")
        .map((record) => record.raw.externalId)
        .filter((id): id is string => Boolean(id));
      const existingLiepinSignatures = importedJobRecords
        .filter((record) => record.raw.sourceId === "liepin")
        .map(({ raw }) => [raw.rawTitle, raw.companyName, raw.locationText, raw.metadata?.["salaryText"]]
          .map((part) => String(part ?? "").toLowerCase().replace(/\s+/g, ""))
          .join("|"))
        .filter((signature) => signature.split("|").filter(Boolean).length >= 3);
      const refreshJobs = importedJobRecords
        .filter(({ raw }) =>
          raw.sourceId === "liepin" &&
          raw.metadata?.["detailStatus"] !== "full" &&
          Boolean(raw.externalId && raw.sourceUrl),
        )
        .slice(0, targetCount)
        .map(({ raw }) => ({
          externalId: raw.externalId!,
          sourceUrl: raw.sourceUrl!,
          rawTitle: raw.rawTitle,
          rawDescription: raw.rawDescription,
          ...(raw.companyName ? { companyName: raw.companyName } : {}),
          ...(raw.locationText ? { locationText: raw.locationText } : {}),
          ...(raw.metadata ? { metadata: raw.metadata } : {}),
        }));
      const response = await fetch("/api/discover-liepin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keywords, cities, targetCount, excludeExternalIds: existingLiepinIds, excludeSignatures: existingLiepinSignatures, refreshJobs }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Liepin discovery failed.");
      const selectedCityPreferences = searchCities.filter((city) => selectedCities.includes(city.id));
      const fetchedJobs = Array.isArray(payload.jobs) ? payload.jobs : [];
      const cityMatchedJobs = fetchedJobs.filter((job) =>
        isJobInSelectedCities(job.locationText, selectedCityPreferences),
      );
      const enrichedJobs = Array.isArray(payload.enrichedJobs) ? payload.enrichedJobs : [];
      const rejectedByCity = fetchedJobs.length - cityMatchedJobs.length;
      const summary = importDiscoveredJobs([...cityMatchedJobs, ...enrichedJobs], "Liepin");
      const sourceReport = typeof payload.message === "string" && payload.message.trim()
        ? "。抓取日志：" + payload.message
        : "";
      setLiepinDiscoveryMessage("猎聘抓取 " + cityMatchedJobs.length + " 个 · 已保存职位补全介绍 " + enrichedJobs.length + " 个 · 地点不符排除 " + rejectedByCity +
        " 个 · 新增 " + summary.added + " 个 · 更新 " + summary.updated + " 个 · 重复 " + summary.duplicates + sourceReport);
    } catch (error) {
      setLiepinDiscoveryMessage(error instanceof Error ? error.message : "Liepin discovery failed.");
    } finally {
      setDiscoveringLiepin(false);
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
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageMatches = visible.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <AppShell>
      <PageHeading
        eyebrow="AI career matching"
        title="Find the few roles worth your attention"
        description={"Ranked by immediate fit and career growth. Current strongest direction: " + (topDirection?.direction.name ?? "—") + "."}
      />

      {suggestions.length ? (
        <div className="mb-4 rounded-2xl border border-azure/20 bg-azure/5 px-4 py-3">
          {suggestions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">{s.message}</p>
              <div className="flex gap-2">
                <button onClick={() => acceptSuggestion(s)} className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-cream">Update</button>
                <button onClick={() => dismissSuggestion(s.id)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold">Keep</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 rounded-2xl border border-ink/10 bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <div className="text-sm font-semibold">Job discovery</div>
            <div className="mt-0.5 text-xs text-ink/45">
              51Job + Liepin · {selectedCities.length} cities · {keywordInput.split(/[，,、\n]+/).filter(Boolean).length} keywords
              {discovery.lastSyncedAt ? " · Last sync " + new Date(discovery.lastSyncedAt).toLocaleString() : ""}
            </div>
            <div className="mt-1 text-xs text-ink/45">Liepin may open a browser for manual sign-in. Searches stop if the site shows a verification challenge.</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowSearch((value) => !value)} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand">
              {showSearch ? "Hide search settings" : "Search settings"}
            </button>
            <button type="button" onClick={discover51Job} disabled={discovering} className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep disabled:opacity-50">
              {discovering ? "Searching…" : "Search 51Job"}
            </button>
            <button type="button" onClick={discoverLiepin} disabled={discoveringLiepin} className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand disabled:opacity-50">
              {discoveringLiepin ? "Searching…check browser" : "Search 猎聘"}
            </button>
          </div>
        </div>
        {showSearch ? (
          <div className="border-t border-ink/10 px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink/60">Keywords</span>
                <input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} placeholder="AI产品经理, AI产品助理, AI应用产品" className="w-full rounded-xl border border-ink/15 bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-azure" />
              </label>
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-ink/60">Cities</span>
                <div className="flex flex-wrap gap-1.5">
                  {searchCities.map((city) => {
                    const checked = selectedCities.includes(city.id);
                    return <button key={city.id} type="button" onClick={() => setSelectedCities((current) => checked ? current.filter((id) => id !== city.id) : [...current, city.id])} className={checked ? "rounded-full bg-ink px-3 py-2 text-xs font-semibold text-cream" : "rounded-full border border-ink/15 px-3 py-2 text-xs font-medium hover:bg-sand"}>{city.name}</button>;
                  })}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink/60">Collect</span>
                <input type="number" min={1} max={500} step={1} value={targetCountInput} onChange={(e) => setTargetCountInput(e.target.value)} className="w-24 rounded-xl border border-ink/15 bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-azure" />
              </label>
            </div>
            {discoveryMessage ? <div className="mt-3 rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink/70">{discoveryMessage}</div> : null}
            {liepinDiscoveryMessage ? <div className="mt-3 whitespace-pre-wrap rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink/70">{liepinDiscoveryMessage}</div> : null}
          </div>
        ) : (discoveryMessage || liepinDiscoveryMessage) ? (
          <div className="border-t border-ink/10 px-4 py-3 text-xs text-ink/60">
            {discoveryMessage ? <div>{discoveryMessage}</div> : null}
            {liepinDiscoveryMessage ? <div className="mt-2 whitespace-pre-wrap">{liepinDiscoveryMessage}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={filter === f.key ? "rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream" : "rounded-full border border-ink/10 px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-sand"}>{f.label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setShowProfile((value) => !value)} className="text-xs font-semibold text-azure hover:text-azure-deep">
          {showProfile ? "Hide AI career profile" : "Show AI career profile"}
        </button>
      </div>

      {showProfile ? <div className="mb-5"><AICareerProfileCard aiProfile={aiProfile} onRefresh={refreshAiProfile} /></div> : null}

      <div className="mb-3 flex items-center justify-between text-xs text-ink/45">
        <span>{visible.length} roles · showing {visible.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, visible.length)}</span>
        <span>Sorted by overall match</span>
      </div>

      <div className="space-y-2.5">
        {pageMatches.map((match) => <CareerMatchCard key={match.job.id} match={match} compact />)}
        {visible.length === 0 ? <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">Nothing passes this filter. Loosen it, or adjust your career profile.</p> : null}
      </div>

      {pageCount > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button type="button" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:opacity-30">Previous</button>
          <span className="text-xs font-semibold text-ink/45">Page {safePage} / {pageCount}</span>
          <button type="button" disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:opacity-30">Next</button>
        </div>
      ) : null}
    </AppShell>
  );
}
