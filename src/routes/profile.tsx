import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, MapPin, Sparkles, Target, WalletCards, Zap } from "lucide-react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { CareerProfileEditor } from "@/components/career-profile-editor";
import { formatSalary } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import type { Profile, WorkMode } from "@/lib/types";
import { createSearchCity } from "@/lib/job-search-preferences";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "我的资料 — Solstice" },
      { name: "description", content: "编辑整个系统共用的职业资料。" },
    ],
  }),
  component: ProfilePage,
});

const modes: Array<WorkMode | "any"> = ["remote", "hybrid", "onsite", "any"];
const modeLabel: Record<WorkMode | "any", string> = {
  remote: "远程",
  hybrid: "混合",
  onsite: "现场",
  any: "不限",
};

function ProfilePage() {
  const { profile, updateProfile, hydrated, searchCities, addSearchCity, removeSearchCity, updateSearchCity } = useWorkspace();
  const [draft, setDraft] = useState<Profile>(profile);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => { if (hydrated) setDraft(profile); }, [hydrated, profile]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    updateProfile(draft);
    setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="PROFILE · 我的资料"
        title="你的职业工作台"
        description="这里的资料会直接影响岗位理解、匹配分数与推荐结果。"
        action={
          <div className="flex items-center gap-3">
            {savedAt ? <span className="text-xs font-semibold text-sage">已保存 {savedAt}</span> : null}
            <button onClick={save} className="group inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-cream shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:bg-ink/90">
              <Sparkles className="size-4 text-ochre" /> 保存并重新匹配
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <section className="grain relative col-span-12 overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-8">
          <div className="absolute -right-12 -top-16 size-44 rounded-full bg-ochre/25 blur-3xl" />
          <div className="relative flex flex-wrap items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-ink text-cream shadow-xl shadow-ink/10">
              <span className="font-display text-2xl font-extrabold">S</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-extrabold">{draft.name}</h2>
                <span className="rounded-full bg-ochre/25 px-2.5 py-1 text-[10px] font-bold text-ink">{draft.seniority.toUpperCase()}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink/65">{draft.headline}</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/55">{draft.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-ink/60">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1.5"><MapPin className="size-3.5" />{draft.location}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1.5"><BriefcaseBusiness className="size-3.5" />{modeLabel[draft.workModePreference]}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand px-2.5 py-1.5"><WalletCards className="size-3.5" />{formatSalary(draft.minSalary)} 起</span>
              </div>
            </div>
          </div>
        </section>

        <div className="col-span-12 grid grid-cols-2 gap-4 lg:col-span-4 lg:grid-cols-1">
          <MiniCard icon={<Target className="size-4" />} label="匹配核心技能" value={String(profile.skills.length)} note="已进入匹配引擎" />
          <MiniCard icon={<Zap className="size-4" />} label="探索方向" value={String(profile.targetTitles.length)} note="保持开放，不锁死职位" />
        </div>

        <section className="col-span-12 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm lg:col-span-7">
          <CardHeader title="核心能力" en="CORE SKILLS" />
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.skills.map((skill, i) => (
              <div key={skill.name} className="rounded-xl bg-sand/75 p-3 transition hover:-translate-y-0.5 hover:bg-ochre/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold">{skill.name}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-extrabold">{skill.weight}/5</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <div className="h-full rounded-full bg-ochre" style={{ width: `${(skill.weight / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 rounded-2xl border border-ink/10 bg-ink p-4 text-cream shadow-sm lg:col-span-5">
          <CardHeader title="正在探索" en="DIRECTIONS" dark />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {profile.targetTitles.map((title) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-semibold transition hover:bg-ochre/15">
                <span className="mr-2 text-ochre">✦</span>{title}
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <CardHeader title="求职偏好" en="JOB PREFERENCES" />
          <div className="grid gap-4 md:grid-cols-[1fr_1.25fr]">
            <div>
              <div className="mb-2 text-[10px] font-bold tracking-widest text-ink/40 uppercase">工作方式</div>
              <div className="flex flex-wrap gap-2">
                {modes.map((mode) => (
                  <button key={mode} onClick={() => set("workModePreference", mode)} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${draft.workModePreference === mode ? "bg-ink text-cream shadow-sm" : "bg-sand text-ink/55 hover:bg-ochre/20"}`}>
                    {modeLabel[mode]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-widest text-ink/40 uppercase">
                <span>最低期望薪资</span><span className="text-ink">{formatSalary(draft.minSalary)}</span>
              </div>
              <input type="range" min={40000} max={220000} step={5000} value={draft.minSalary} onChange={(e) => set("minSalary", Number(e.target.value))} className="h-1.5 w-full accent-ochre" />
            </div>
          </div>
        </section>

        <section className="col-span-12 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
          <CardHeader title="求职城市" en="SEARCH LOCATIONS" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {searchCities.map((city) => (
              <div key={city.id} className="group flex items-center gap-2 rounded-xl bg-sand/80 p-2">
                <MapPin className="ml-1 size-4 shrink-0 text-ink/35" />
                <input value={city.name} onChange={(e) => updateSearchCity({ ...city, name: e.target.value })} className={inputClass} />
                <button type="button" onClick={() => removeSearchCity(city.id)} disabled={searchCities.length <= 1} className="rounded-lg px-2 py-2 text-xs font-bold text-ink/35 hover:bg-white hover:text-destructive disabled:opacity-20">×</button>
              </div>
            ))}
            <button type="button" onClick={() => { const id = `custom-${Date.now()}`; addSearchCity(createSearchCity("新城市", "", id)); }} className="rounded-xl border border-dashed border-ink/15 bg-white px-3 py-3 text-xs font-bold text-ink/45 transition hover:border-ochre hover:bg-ochre/10">+ 添加城市</button>
          </div>
        </section>
      </div>

      <div className="mt-6">
        <CareerProfileEditor />
      </div>
    </AppShell>
  );
}

function CardHeader({ title, en, dark = false }: { title: string; en: string; dark?: boolean }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className={`text-base font-extrabold ${dark ? "text-cream" : "text-ink"}`}>{title}</h2>
        <div className={`mt-0.5 text-[9px] font-bold tracking-[0.2em] ${dark ? "text-cream/35" : "text-ink/35"}`}>{en}</div>
      </div>
      <Sparkles className={`size-4 ${dark ? "text-ochre" : "text-ink/20"}`} />
    </div>
  );
}

function MiniCard({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink/55"><span className="grid size-8 place-items-center rounded-xl bg-ochre/20 text-ink">{icon}</span>{label}</div>
      <div className="font-display text-2xl font-extrabold">{value}</div>
      <div className="mt-1 text-[10px] font-semibold text-ink/35">{note}</div>
    </div>
  );
}

const inputClass = "min-w-0 w-full rounded-lg border border-ink/8 bg-white px-2.5 py-2 text-xs font-semibold text-ink outline-none focus:border-ochre focus:ring-2 focus:ring-ochre/15";
