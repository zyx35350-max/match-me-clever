import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerProfileEditor } from "@/components/career-profile-editor";
import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { Profile, Seniority, WorkMode } from "@/lib/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Solstice" },
      {
        name: "description",
        content:
          "Edit the profile your match scores are built from: weighted skills, target titles, salary floor, seniority and work-mode preference.",
      },
      { property: "og:title", content: "My Profile — Solstice" },
      {
        property: "og:description",
        content: "Tune the weighted skills and preferences that drive your match scores.",
      },
    ],
  }),
  component: ProfilePage,
});

const modes: Array<WorkMode | "any"> = ["remote", "hybrid", "onsite", "any"];
const levels: Seniority[] = ["mid", "senior", "lead", "principal"];

function ProfilePage() {
  const { profile, updateProfile, hydrated } = useWorkspace();
  const [draft, setDraft] = useState<Profile>(profile);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");

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
        description="Every field here feeds the score. Skill weights matter most — they carry half of each match."
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
              <Field label="Seniority target">
                <select
                  value={draft.seniority}
                  onChange={(e) => set("seniority", e.target.value as Seniority)}
                  className={inputClass}
                >
                  {levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Summary" className="mt-4">
              <textarea
                value={draft.summary}
                rows={3}
                onChange={(e) => set("summary", e.target.value)}
                className={inputClass}
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Weighted skills</SectionTitle>
            <p className="mb-4 text-sm text-ink/60">
              Drag the weight up for skills you want the matcher to chase. 5 = must have.
            </p>
            <div className="space-y-4">
              {draft.skills.map((skill, i) => (
                <div key={skill.name} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-semibold">{skill.name}</div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={skill.weight}
                    onChange={(e) => {
                      const weight = Number(e.target.value);
                      set(
                        "skills",
                        draft.skills.map((s, idx) => (idx === i ? { ...s, weight } : s)),
                      );
                    }}
                    className="h-1 flex-1 accent-azure"
                  />
                  <div className="w-6 text-right text-sm font-semibold text-azure">
                    {skill.weight}
                  </div>
                  <button
                    onClick={() =>
                      set(
                        "skills",
                        draft.skills.filter((_, idx) => idx !== i),
                      )
                    }
                    className="text-xs font-semibold text-ink/40 hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <input
                value={newSkill}
                placeholder="Add a skill"
                onChange={(e) => setNewSkill(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={() => {
                  const name = newSkill.trim();
                  if (!name) return;
                  set("skills", [...draft.skills, { name, weight: 3 }]);
                  setNewSkill("");
                }}
                className="shrink-0 rounded-xl border border-ink/20 px-4 text-sm font-semibold hover:bg-sand"
              >
                Add
              </button>
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
                min={60000}
                max={220000}
                step={5000}
                value={draft.minSalary}
                onChange={(e) => set("minSalary", Number(e.target.value))}
                className="h-1 w-full accent-ochre"
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Target titles</SectionTitle>
            <div className="space-y-2">
              {draft.targetTitles.map((title, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={title}
                    onChange={(e) =>
                      set(
                        "targetTitles",
                        draft.targetTitles.map((t, idx) => (idx === i ? e.target.value : t)),
                      )
                    }
                    className={inputClass}
                  />
                  <button
                    onClick={() =>
                      set(
                        "targetTitles",
                        draft.targetTitles.filter((_, idx) => idx !== i),
                      )
                    }
                    className="shrink-0 px-2 text-xs font-semibold text-ink/40 hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => set("targetTitles", [...draft.targetTitles, ""])}
              className="mt-4 w-full rounded-lg border border-ink/20 py-2 text-xs font-semibold hover:bg-sand"
            >
              Add title
            </button>
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
