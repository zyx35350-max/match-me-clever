import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerProfileEditor } from "@/components/career-profile-editor";
import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { Profile, WorkMode } from "@/lib/types";
import { createSearchCity, type JobSearchCity } from "@/lib/job-search-preferences";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "我的资料 — Solstice" },
      {
        name: "description",
        content:
          "编辑整个系统共用的职业资料：技能、经历证据、偏好、限制条件和学习方向。",
      },
      { property: "og:title", content: "我的资料 — Solstice" },
      {
        property: "og:description",
        content: "这里的职业资料会直接影响所有岗位匹配结果。",
      },
    ],
  }),
  component: ProfilePage,
});

const modes: Array<WorkMode | "any"> = ["remote", "hybrid", "onsite", "any"];

function ProfilePage() {
  const {
    profile,
    updateProfile,
    hydrated,
    searchCities,
    addSearchCity,
    removeSearchCity,
    updateSearchCity,
  } = useWorkspace();
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
        eyebrow="我的资料"
        title="系统目前了解的你"
        description="这是整个系统使用的核心职业资料。下面可以编辑基础信息、搜索城市、偏好和职业档案。"
        action={
          <div class姓名="flex items-center gap-3">
            {savedAt ? <span class姓名="text-xs text-sage">已保存于 {savedAt}</span> : null}
            <button
              onClick={save}
              class姓名="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep"
            >
              保存并重新匹配
            </button>
          </div>
        }
      />

      <div class姓名="grid grid-cols-12 gap-6">
        <div class姓名="col-span-12 space-y-6 lg:col-span-7">
          <section class姓名="rounded-xl border border-ink/10 bg-card p-4">
            <SectionTitle>基础信息</SectionTitle>
            <div class姓名="grid gap-4 sm:grid-cols-2">
              <Field label="姓名">
                <input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  class姓名={inputClass}
                />
              </Field>
              <Field label="职业标题">
                <input
                  value={draft.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  class姓名={inputClass}
                />
              </Field>
              <Field label="所在城市">
                <input
                  value={draft.location}
                  onChange={(e) => set("location", e.target.value)}
                  class姓名={inputClass}
                />
              </Field>
              <Field label="职业阶段（根据工作年限）">
                <p class姓名="rounded-xl bg-sand px-3.5 py-2.5 text-sm capitalize">
                  {profile.seniority}
                </p>
              </Field>
            </div>
            <Field label="个人简介（由职业档案生成）" class姓名="mt-4">
              <p class姓名="rounded-xl bg-sand px-3.5 py-2.5 text-sm leading-relaxed text-ink/75">
                {profile.summary}
              </p>
            </Field>
          </section>

          <section class姓名="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>求职城市</SectionTitle>
            <p class姓名="mb-4 text-sm text-ink/60">
              这些城市会出现在岗位匹配的搜索条件中。可以添加、修改名称和 51Job 地区编码。
            </p>
            <div class姓名="space-y-3">
              {searchCities.map((city) => (
                <div key={city.id} class姓名="grid gap-3 rounded-xl bg-sand p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={city.name}
                    onChange={(e) => updateSearchCity({ ...city, name: e.target.value })}
                    class姓名={inputClass}
                    aria-label="City name"
                  />
                  <input
                    value={city.jobArea}
                    onChange={(e) => updateSearchCity({ ...city, jobArea: e.target.value })}
                    class姓名={inputClass}
                    aria-label="51Job area code"
                    placeholder="51Job area code"
                  />
                  <button
                    type="button"
                    onClick={() => removeSearchCity(city.id)}
                    disabled={searchCities.length <= 1}
                    class姓名="rounded-xl border border-ink/10 px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-card disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const id = `custom-${Date.now()}`;
                addSearchCity(createSearchCity("New city", "", id));
              }}
              class姓名="mt-4 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold hover:bg-sand"
            >
              + 添加城市
            </button>
            <p class姓名="mt-3 text-[11px] text-ink/45">
              默认城市：深圳、惠州、珠海。51Job 地区编码仅用于搜索 51Job。
            </p>
          </section>

          <section class姓名="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>Skills the matcher uses</SectionTitle>
            <p class姓名="mb-4 text-sm text-ink/60">
              Weight comes from the level you set on each proven skill in the career profile below —
              there is no separate skill list to keep in sync.
            </p>
            <div class姓名="space-y-3">
              {profile.skills.map((skill) => (
                <div key={skill.name} class姓名="flex items-center gap-4">
                  <div class姓名="w-56 text-sm font-semibold">{skill.name}</div>
                  <div class姓名="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
                    <div
                      class姓名="h-full rounded-full bg-azure"
                      style={{ width: `${(skill.weight / 5) * 100}%` }}
                    />
                  </div>
                  <div class姓名="w-6 text-right text-sm font-semibold text-azure">
                    {skill.weight}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div class姓名="col-span-12 space-y-6 lg:col-span-5">
          <section class姓名="rounded-xl bg-sand p-4">
            <SectionTitle>偏好</SectionTitle>
            <Field label="工作方式">
              <div class姓名="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => set("workModePreference", mode)}
                    class姓名={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
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
            <Field label={`期望薪资下限 — ${formatSalary(draft.minSalary)}`} class姓名="mt-5">
              <input
                type="range"
                min={40000}
                max={220000}
                step={5000}
                value={draft.minSalary}
                onChange={(e) => set("minSalary", Number(e.target.value))}
                class姓名="h-1 w-full accent-ochre"
              />
            </Field>
          </section>

          <section class姓名="rounded-2xl border border-ink/10 bg-card p-6">
            <SectionTitle>正在探索的方向</SectionTitle>
            <p class姓名="mb-3 text-sm text-ink/60">
              Kept deliberately open — these follow your current career profile rather than fixing a
              job title.
            </p>
            <div class姓名="space-y-2 text-sm font-semibold">
              {profile.targetTitles.map((title) => (
                <div key={title} class姓名="rounded-xl bg-sand px-3.5 py-2.5">
                  {title}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div class姓名="mt-8">
        <CareerProfileEditor />
      </div>
    </AppShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-azure";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 class姓名="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
  class姓名 = "",
}: {
  label: string;
  children: React.ReactNode;
  class姓名?: string;
}) {
  return (
    <label class姓名={`block ${class姓名}`}>
      <span class姓名="mb-1.5 block text-xs font-semibold text-ink/60">{label}</span>
      {children}
    </label>
  );
}
