import { createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { ScoreBar } from "@/components/match-parts";
import { useCareer } from "@/lib/use-career";
import type { DirectionAssessment } from "@/lib/career-types";

export const Route = createFileRoute("/directions")({
  head: () => ({
    meta: [
      { title: "Career Directions — Solstice" },
      {
        name: "description",
        content:
          "Six career directions scored as AI hypotheses against your profile: why each may fit, the evidence behind it, the skill gaps and a concrete next step.",
      },
      { property: "og:title", content: "Career Directions — Solstice" },
      {
        property: "og:description",
        content:
          "AI × E-commerce, Product, Content, Visual, Operations and open exploration, scored for you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DirectionsPage,
});

function DirectionsPage() {
  const { directions } = useCareer();

  return (
    <AppShell>
      <PageHeading
        eyebrow="Career directions"
        title="Six directions, scored as hypotheses"
        description="Weighted: current experience 25%, interest 20%, transferable skills 15%, AI relevance 15%, growth 10%, learning potential 10%, market 5%. These are AI assessments, not measurements — they move whenever your profile does."
      />
      <div className="space-y-4">
        {directions.map((assessment) => (
          <DirectionCard key={assessment.direction.id} assessment={assessment} />
        ))}
      </div>
    </AppShell>
  );
}

function DirectionCard({ assessment }: { assessment: DirectionAssessment }) {
  const { direction, breakdown } = assessment;
  const rows: Array<[string, number]> = [
    ["Current experience fit (25%)", breakdown.currentExperience],
    ["Interest & motivation (20%)", breakdown.interest],
    ["Transferable skills (15%)", breakdown.transferable],
    ["AI relevance (15%)", breakdown.aiRelevance],
    ["Growth potential (10%)", breakdown.growth],
    ["Learning potential (10%)", breakdown.learning],
    ["Market opportunity (5%)", breakdown.market],
  ];

  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">
            {direction.name}
            {direction.nameOriginal ? (
              <span className="ml-2 text-sm font-medium text-ink/45">{direction.nameOriginal}</span>
            ) : null}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink/65">{direction.blurb}</p>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-extrabold text-azure">{assessment.score}</div>
          <div className="text-[10px] tracking-[0.2em] text-ink/45 uppercase">
            AI assessment / 100
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Block title="Why it may fit" items={assessment.why} />
          <Block title="Evidence from your profile" items={assessment.evidence} />
          <Block title="Potential advantages" items={assessment.advantages} />
        </div>
        <div className="space-y-4">
          <Block title="Skill gaps" items={assessment.gaps} tone="ochre" />
          <Block title="What you could learn" items={assessment.couldLearn} />
          <div className="rounded-xl bg-sand p-4">
            <div className="text-[11px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
              Suggested next step
            </div>
            <p className="mt-1 text-[13px] font-semibold">{assessment.nextStep}</p>
          </div>
        </div>
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-xs font-semibold text-azure">
          How this score was built
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-ink/60">{label}</span>
                <span className="font-semibold text-azure">{value}</span>
              </div>
              <ScoreBar value={value} />
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function Block({
  title,
  items,
  tone = "ink",
}: {
  title: string;
  items: string[];
  tone?: "ink" | "ochre";
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
        {title}
      </div>
      <ul className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13px] leading-relaxed text-ink/75">
            <span className={tone === "ochre" ? "text-ochre" : "text-azure"}>·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
