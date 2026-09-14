import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { MatchRow, WhyItFits } from "@/components/match-parts";
import { rankJobs } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today's Matches — Solstice" },
      {
        name: "description",
        content:
          "The freshly posted roles scored highest against your profile today, each with the reasons it fits and the gaps to weigh.",
      },
      { property: "og:title", content: "Today's Matches — Solstice" },
      {
        property: "og:description",
        content: "Freshly posted roles ranked for you, with reasons and gaps spelled out.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { profile, jobs } = useWorkspace();
  const ranked = rankJobs(
    profile,
    jobs.filter((j) => j.postedDaysAgo <= 2),
  );
  const [lead, ...rest] = ranked;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Today"
        title={`${ranked.length} new roles scored`}
        description="Roles posted in the last 48 hours, ranked by fit. Reviewed items stay in Matching."
      />

      {lead ? (
        <div className="mb-6 rounded-2xl border border-ink/10 bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
                Best fit today
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold">{lead.job.title}</h2>
              <div className="text-sm text-ink/60">
                {lead.job.company} · {lead.job.location}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-4xl font-extrabold text-azure">{lead.score}%</div>
              <div className="text-[11px] tracking-[0.2em] text-ink/50 uppercase">match</div>
            </div>
          </div>
          <WhyItFits match={lead} />
        </div>
      ) : null}

      <div className="space-y-3">
        {rest.map((match) => (
          <MatchRow key={match.job.id} match={match} />
        ))}
      </div>
    </AppShell>
  );
}
