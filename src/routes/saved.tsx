import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { MatchRow } from "@/components/match-parts";
import { useWorkspace } from "@/lib/store";
import { useCareer } from "@/lib/use-career";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Jobs — Solstice" },
      {
        name: "description",
        content: "The roles you've shortlisted, re-scored against your current profile.",
      },
      { property: "og:title", content: "Saved Jobs — Solstice" },
      {
        property: "og:description",
        content: "Your shortlist, re-scored every time your profile changes.",
      },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { saved } = useWorkspace();
  // Same authoritative matches as every other page, filtered to the shortlist.
  const { matches: all } = useCareer();
  const matches = all.filter((m) => saved.includes(m.job.id));

  return (
    <AppShell>
      <PageHeading
        eyebrow="Saved"
        title={`${matches.length} shortlisted roles`}
        description="Scores here update automatically when you edit your profile."
      />
      <div className="space-y-3">
        {matches.map((match) => (
          <MatchRow key={match.job.id} match={match} />
        ))}
        {matches.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-card p-8 text-center">
            <p className="text-sm text-ink/60">Nothing saved yet.</p>
            <Link
              to="/matching"
              className="mt-4 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
            >
              Browse matches
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
