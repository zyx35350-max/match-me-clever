import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerMatchCard, ExplanationBlock } from "@/components/career-match-card";
import { useCareer } from "@/lib/use-career";

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
  const { matches } = useCareer();
  const shortlist = matches
    .filter((m) => m.job.postedDaysAgo <= 3 && !m.notRecommended)
    .slice(0, 4);
  const [lead, ...rest] = shortlist;

  return (
    <AppShell>
      <PageHeading
        eyebrow="Today"
        title="Today's opportunities worth your attention"
        description="A deliberately short list. Each one is scored for how easily you could land it and how much it moves your direction forward."
      />

      {lead ? (
        <div className="mb-6 rounded-2xl border border-ink/10 bg-card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
                Highest priority today
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {lead.job.titleOriginal ?? lead.job.title}
              </h2>
              <div className="text-sm text-ink/60">
                {lead.job.company} · {lead.job.location} ·{" "}
                {lead.job.employmentType === "parttime" ? "Part-time" : "Full-time"}
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="font-display text-3xl font-extrabold text-azure">
                  {lead.immediateFit}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  Immediate fit
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-ochre">
                  {lead.careerGrowthValue}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  Growth value
                </div>
              </div>
            </div>
          </div>
          <ExplanationBlock match={lead} />
        </div>
      ) : (
        <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">
          Nothing new worth your attention today.
        </p>
      )}

      <div className="space-y-3">
        {rest.map((match) => (
          <CareerMatchCard key={match.job.id} match={match} compact />
        ))}
      </div>
    </AppShell>
  );
}
