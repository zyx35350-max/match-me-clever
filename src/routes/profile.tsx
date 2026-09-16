import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerProfileEditor } from "@/components/career-profile-editor";
import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { Profile, WorkMode } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Solstice" },
      {
        name: "description",
        content:
          "Edit the one career profile the whole app scores against: skills with evidence, preferences, deal breakers and learning potential.",
      },
      { property: "og:title", content: "My Profile — Solstice" },
      {
        property: "og:description",
        content: "Edit the single career profile that drives every match score.",
      },
    ],
  }),
  component: ProfilePage,
});

const modes: Array<WorkMode | "any"> = ["remote", "hybrid", "onsite", "any"];

function ProfilePage() {
  const { profile, updateProfile, hydrated } = useWorkspace();
  const [draft, setDraft] = useState<Profile>(profile);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) setDraft(profile);
  }, [hydrated, profile]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    updateProfile(draft);
    setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Profile"
        title="What the matcher knows about you"
        description="This is the single profile every page scores against. Skills, evidence, preferences and deal breakers are edited in the career profile below."
        action={
          <div className="flex items-center gap-3">
            {savedAt ? <span className="text-xs text-sage">Saved at {savedAt}</span> : null}
            <button
              onClick={save}
              className="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep"
            >
              Save & re-score
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Basics</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Headline">
                <input
                  value={draft.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Based in">
                <input
                  value={draft.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Level (from years of experience)">
                <p className="rounded-xl bg-sand px-3.5 py-2.5 text-sm capitalize">
                  {profile.seniority}
                </p>
              </Field>
            </div>
            <Field label="Summary (derived from your career profile)" className="mt-4">
              <p className="rounded-xl bg-sand px-3.5 py-2.5 text-sm leading-relaxed text-ink/75">
                {profile.summary}
              </p>
            </Field>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Skills the matcher uses</SectionTitle>
            <p className="mb-4 text-sm text-ink/60">
              Weight comes from the level you set on each proven skill in the career profile below —
              there is no separate skill list to keep in sync.
            </p>
            <div className="space-y-3">
              {profile.skills.map((skill) => (
                <div key={skill.name} className="flex items-center gap-4">
                  <div className="w-56 text-sm font-semibold">{skill.name}</div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-azure"
                      style={{ width: `${(skill.weight / 5) * 100}%` }}
                    />
                  </div>
                  <div className="w-6 text-right text-sm font-semibold text-azure">
                    {skill.weight}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-5">
          <section className="rounded-2xl bg-sand p-6">
            <SectionTitle>Preferences</SectionTitle>
            <Field label="Work mode">
              <div className="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => set("workModePreference", mode)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
                      draft.workModePreference === mode
                        ? "bg-ink text-cream"
                        : "border border-ink/20 hover:bg-card/60"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={`Salary floor — ${formatSalary(draft.minSalary)}`} className="mt-5">
              <input
                type="range"
                min={40000}
                max={220000}
                step={5000}
                value={draft.minSalary}
                onChange={(e) => set("minSalary", Number(e.target.value))}
                className="h-1 w-full accent-ochre"
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Directions you're exploring</SectionTitle>
            <p className="mb-3 text-sm text-ink/60">
              Kept deliberately open — these follow your current career profile rather than fixing a
              job title.
            </p>
            <div className="space-y-2 text-sm font-semibold">
              {profile.targetTitles.map((title) => (
                <div key={title} className="rounded-xl bg-sand px-3.5 py-2.5">
                  {title}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-8">
        <CareerProfileEditor />
      </div>
    </AppShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-azure";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-ink/60">{label}</span>
      {children}
    </label>
  );
}
