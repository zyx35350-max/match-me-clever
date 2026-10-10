import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { MatchRow } from "@/components/match-parts";
import { useWorkspace } from "@/lib/store";
import { useCareer } from "@/lib/use-career";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "已收藏 — Solstice" },
      {
        name: "description",
        content: "查看已收藏的岗位及其根据当前职业资料重新计算的匹配结果。",
      },
      { property: "og:title", content: "已收藏 — Solstice" },
      {
        property: "og:description",
        content: "职业资料更新后，收藏岗位的匹配结果也会自动更新。",
      },
    ],
  }),
  component: 已收藏Page,
});

function 已收藏Page() {
  const { saved } = useWorkspace();
  // Same authoritative matches as every other page, filtered to the shortlist.
  const { matches: all } = useCareer();
  const matches = all.filter((m) => saved.includes(m.job.id));

  return (
    <AppShell>
      <PageHeading
        eyebrow="已收藏"
        title={`已收藏 ${matches.length} 个岗位`}
        description="修改职业资料后，这里的岗位匹配结果会自动更新。"
      />
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchRow key={match.job.id} match={match} />
        ))}
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-card p-8 text-center">
            <p className="text-sm text-ink/60">还没有收藏岗位。</p>
            <Link
              to="/matching"
              className="mt-4 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
            >
              浏览匹配岗位
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
