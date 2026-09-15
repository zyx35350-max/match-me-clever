import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { AICareerProfile, ClaimKind } from "@/lib/career-types";

const KIND_LABEL: Record<ClaimKind, string> = {
  fact: "Verified fact",
  preference: "Your preference",
  inference: "AI inference",
};

const KIND_STYLE: Record<ClaimKind, string> = {
  fact: "bg-sage/20 text-sage",
  preference: "bg-azure/12 text-azure",
  inference: "bg-ochre/15 text-ochre",
};

export function AICareerProfileCard({
  aiProfile,
  onRefresh,
}: {
  aiProfile: AICareerProfile;
  onRefresh: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const [filter, setFilter] = useState<ClaimKind | "all">("all");

  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
            AI Career Profile — hypothesis, not a job title
          </div>
          <p className="mt-2 max-w-2xl font-display text-lg leading-snug font-bold">
            “{aiProfile.identityHypothesis}”
          </p>
          <p className="mt-2 text-xs text-ink/55">
            Generated from your structured profile. Facts, preferences and AI inferences are labelled
            separately — inferences are guesses you can overrule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
          >
            Refresh AI profile
          </button>
          <Link
            to="/profile"
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand"
          >
            Edit profile
          </Link>
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand"
          >
            {showWhy ? "Hide reasoning" : "Why this conclusion"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["all", "fact", "preference", "inference"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === k ? "bg-ink text-cream" : "border border-ink/15 hover:bg-sand"
            }`}
          >
            {k === "all" ? "Everything" : KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {aiProfile.sections.map((section) => {
          const claims = section.claims.filter((c) => filter === "all" || c.kind === filter);
          if (!claims.length) return null;
          return (
            <div key={section.key} className="rounded-xl border border-ink/10 p-4">
              <h3 className="font-display text-sm font-bold">{section.title}</h3>
              <ul className="mt-2 space-y-2.5">
                {claims.map((claim) => (
                  <li key={claim.text}>
                    <span
                      className={`mr-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[claim.kind]}`}
                    >
                      {KIND_LABEL[claim.kind]}
                    </span>
                    <span className="text-[13px] leading-relaxed text-ink/80">{claim.text}</span>
                    {showWhy ? (
                      <div className="mt-1 border-l-2 border-ink/10 pl-2 text-[12px] text-ink/55">
                        {claim.because}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
