import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerMatchCard, ExplanationBlock } from "@/components/career-match-card";
import { useCareer } from "@/lib/use-career";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "今日推荐 — Solstice" },
      {
        name: "description",
        content:
          "查看近期发布且与你的职业资料匹配度较高的岗位，并了解匹配原因和需要考虑的差距。",
      },
      { property: "og:title", content: "今日推荐 — Solstice" },
      {
        property: "og:description",
        content: "为你推荐近期发布的岗位，并说明匹配原因和待考虑之处。",
      },
    ],
  }),
  component: 今日推荐Page,
});

function 今日推荐Page() {
  const { matches } = useCareer();
  const shortlist = matches
    .filter((m) => m.job.postedDaysAgo <= 3 && !m.notRecommended)
    .slice(0, 4);
  const [lead, ...rest] = shortlist;

  return (
    <AppShell>
      <PageHeading
        eyebrow="今日推荐"
        title="今日推荐's opportunities worth your attention"
        description="精选近期值得关注的岗位，综合评估获得机会的难度以及对职业发展的帮助。"
      />

      {lead ? (
        <div className="mb-6 rounded-2xl border border-ink/10 bg-card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
                今日优先关注
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {lead.job.titleOriginal ?? lead.job.title}
              </h2>
              <div className="text-sm text-ink/60">
                {lead.job.company} · {lead.job.location} ·{" "}
                {lead.job.employmentType === "parttime" ? "兼职" : "全职"}
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="font-display text-3xl font-extrabold text-azure">
                  {lead.immediateFit}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  当前匹配度
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-ochre">
                  {lead.careerGrowthValue}
                </div>
                <div className="text-[10px] tracking-[0.2em] text-ink/50 uppercase">
                  成长潜力
                </div>
              </div>
            </div>
          </div>
          <ExplanationBlock match={lead} />
        </div>
      ) : (
        <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">
          今天暂时没有值得关注的新岗位。
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
