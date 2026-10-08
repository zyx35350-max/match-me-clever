import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties } from "react";
import { MapPin, Sparkles, Target } from "lucide-react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerProfileEditor } from "@/components/career-profile-editor";
import { formatSalary } from "@/lib/matching";
import { useCareer } from "@/lib/use-career";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/store";
import type { Profile, WorkMode } from "@/lib/types";
import { createSearchCity } from "@/lib/job-search-preferences";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "我的资料 — Solstice" },
      { name: "description", content: "管理会直接影响岗位理解、匹配与推荐的职业资料。" },
    ],
  }),
  component: ProfilePage,
});

const modes: Array<WorkMode | "any"> = ["remote", "hybrid", "onsite", "any"];
const modeLabel: Record<WorkMode | "any", string> = {
  remote: "远程",
  hybrid: "混合办公",
  onsite: "现场办公",
  any: "不限",
};

function ProfilePage() {
  const {
    profile,
    career,
    searchCities,
    addSearchCity,
    removeSearchCity,
    updateSearchCity,
    hydrated,
  } = useWorkspace();
  const { directions } = useCareer();
  const { saveProfile } = useAuth();
  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => {
    if (hydrated) setDraft(profile);
  }, [hydrated, profile]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const topDirections = directions.slice(0, 3);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savedBasicAt, setSavedBasicAt] = useState<string | null>(null);

  const saveBasic = async () => {
    setSavingBasic(true);
    updateProfile(draft);
    const result = await saveProfile({
      identity: { name: draft.name, headline: draft.headline, minSalary: draft.minSalary },
      career: profileToCareer(draft, career),
      searchCities,
      onboardingComplete: true,
    });
    setSavingBasic(false);
    if (!result.error) setSavedBasicAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="PROFILE · 我的资料"
        title="你的职业工作台"
        description="这里负责控制岗位理解、匹配分数和推荐逻辑。常用信息直接展示，详细规则按需展开。"
      />

      <div className="space-y-4">
        <section className="yellow-grain relative overflow-hidden rounded-3xl border border-ink/8 bg-white p-5 shadow-[0_14px_45px_rgba(38,31,8,0.06)] md:p-6">
          <div className="absolute -right-20 -top-24 size-56 rounded-full bg-ochre/20 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-ink text-cream shadow-lg shadow-ink/10">
                <span className="font-display text-2xl font-extrabold">S</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-extrabold">{draft.name}</h2>
                  <span className="rounded-full bg-ochre/25 px-2.5 py-1 text-[10px] font-extrabold text-ink">
                    {draft.seniority.toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-ink/65">{draft.headline}</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/55">{draft.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <Signal label="核心技能" value={String(profile.skills.length)} note="进入匹配" />
              <Signal label="探索方向" value={String(profile.targetTitles.length)} note="保持开放" />
              <Signal label="最低薪资" value={formatSalary(draft.minSalary)} note="期望起点" />
              <Signal label="工作方式" value={modeLabel[draft.workModePreference]} note="当前偏好" />
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-ink/8 pt-4">
            <span className="mr-1 text-[10px] font-bold tracking-[0.18em] text-ink/40 uppercase">
              当前方向
            </span>
            {topDirections.map((item) => (
              <span key={item.direction.id} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/85 px-3 py-1.5 text-xs font-bold">
                <span className="text-ochre">✦</span>
                {item.direction.name}
                <span className="text-ink/35">{item.score}</span>
              </span>
            ))}
            <span className="ml-1 text-[11px] text-ink/40">
              AI 方向判断会随着你的资料变化自动更新。
            </span>
            <button type="button" onClick={saveBasic} disabled={savingBasic} className="ml-auto rounded-xl bg-ink px-3 py-2 text-[11px] font-extrabold text-cream disabled:opacity-50">
              {savingBasic ? "保存中…" : savedBasicAt ? "已保存" : "保存基础资料"}
            </button>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <section className="yellow-grain relative overflow-hidden rounded-2xl border border-ink/8 bg-white p-4 shadow-sm ">
            <SectionHeader title="核心能力" en="CORE SKILLS" />
            <div className="grid gap-2 sm:grid-cols-2">
              {profile.skills.map((skill) => (
                <div key={skill.name} className="rounded-xl border border-ink/7 bg-white/80 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{skill.name}</span>
                    <span className="shrink-0 rounded-full bg-ochre/20 px-2 py-0.5 text-[10px] font-extrabold">
                      {skill.weight}/5
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/7">
                    <div
                      className="h-full rounded-full bg-ochre"
                      style={{ width: `${(skill.weight / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-ink/8 bg-white p-4 shadow-sm ">
            <div className="absolute -right-8 -top-8 size-24 rounded-full bg-ochre/18 blur-2xl" />
            <SectionHeader title="求职偏好" en="JOB PREFERENCES" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[10px] font-bold tracking-widest text-ink/40 uppercase">工作方式</div>
                <div className="flex flex-wrap gap-1.5">
                  {modes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => set("workModePreference", mode)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        draft.workModePreference === mode
                          ? "bg-ink text-cream"
                          : "bg-ochre/10 text-ink/55 hover:bg-ochre/20"
                      }`}
                    >
                      {modeLabel[mode]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-widest text-ink/40 uppercase">
                  <span>最低期望薪资</span>
                  <span className="text-ink">{formatSalary(draft.minSalary)}</span>
                </div>
                <input
                  type="range"
                  min={40000}
                  max={220000}
                  step={5000}
                  value={draft.minSalary}
                  onChange={(e) => set("minSalary", Number(e.target.value))}
                  className="profile-range"
                  style={{ "--range-progress": `${((draft.minSalary - 40000) / 180000) * 100}%` } as CSSProperties}
                />
              </div>
            </div>
          </section>
          <section className="relative overflow-hidden rounded-2xl border border-ink/8 bg-white p-4 shadow-sm">
            <SectionHeader title="求职城市" en="SEARCH LOCATIONS" action={<span className="text-[10px] font-semibold text-ink/35">{searchCities.length} 个城市</span>} />
            <div className="flex flex-wrap gap-2">
              {searchCities.map((city) => (
                <div key={city.id} className="group flex items-center gap-1.5 rounded-xl border border-ink/8 bg-ochre/8 px-2 py-1.5">
                  <MapPin className="size-3.5 text-ink/35" />
                  <input
                    value={city.name}
                    onChange={(e) => updateSearchCity({ ...city, name: e.target.value })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeSearchCity(city.id)}
                    disabled={searchCities.length <= 1}
                    className="rounded-md px-1.5 py-1 text-xs font-bold text-ink/30 hover:bg-white hover:text-destructive disabled:opacity-20"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const id = `custom-${Date.now()}`;
                  addSearchCity(createSearchCity("新城市", "", id));
                }}
                className="rounded-xl border border-dashed border-ochre/35 bg-ochre/8 px-3 py-2 text-xs font-bold text-ink/50 transition hover:bg-ochre/15"
              >
                + 添加城市
              </button>
            </div>
          </section>
          </div>
        </div>

        <CareerProfileEditor />
      </div>
    </AppShell>
  );
}

function SectionHeader({
  title,
  en,
  action,
}: {
  title: string;
  en: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold">{title}</h2>
        <div className="mt-0.5 text-[9px] font-bold tracking-[0.2em] text-ink/30">{en}</div>
      </div>
      <div>{action ?? <Sparkles className="size-3.5 text-ochre" />}</div>
    </div>
  );
}

function Signal({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-ink/7 bg-white/85 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-ink/45">
        <Target className="size-3 text-ochre" />
        {label}
      </div>
      <div className="mt-1 font-display text-lg font-extrabold leading-none">{value}</div>
      <div className="mt-1 text-[9px] font-semibold text-ink/30">{note}</div>
    </div>
  );
}

function profileToCareer(profile: Profile, career: ReturnType<typeof useWorkspace>["career"]) {
  return {
    ...career,
    basics: {
      ...career.basics,
      workMode: profile.workModePreference,
      preferredLocations: [profile.location, ...career.basics.preferredLocations.filter((city) => city !== profile.location)],
    },
  };
}

const inputClass = "min-w-0 rounded-lg border border-ink/8 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/15";
