import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, MapPin, Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/store";
import { defaultCareerProfile } from "@/lib/career-data";
import { deriveLegacyProfile } from "@/lib/profile-bridge";
import { createSearchCity } from "@/lib/job-search-preferences";
import type { Profile, WorkMode } from "@/lib/types";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "建立职业画像 — Solstice" },
      { name: "description", content: "填写最重要的职业信息，让 Solstice 开始匹配。" },
    ],
  }),
  component: OnboardingPage,
});

const modeLabels: Record<WorkMode | "any", string> = {
  remote: "远程",
  hybrid: "混合办公",
  onsite: "现场办公",
  any: "不限",
};

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading, saveProfile, refreshProfile, profileComplete } = useAuth();
  const { updateProfile, updateCareer, replaceSearchCities } = useWorkspace();

  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [years, setYears] = useState("");
  const [stage, setStage] = useState("");
  const [education, setEducation] = useState("");
  const [cities, setCities] = useState("");
  const [workMode, setWorkMode] = useState<WorkMode | "any">("any");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPreference, setSalaryPreference] = useState<"range" | "negotiable" | "unlimited">("range");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const career = useMemo(() => ({
    ...defaultCareerProfile,
    basics: {
      ...defaultCareerProfile.basics,
      education: education.trim() || "暂未填写",
      yearsExperience: Math.max(0, Number(years) || 0),
      careerStage: stage.trim() || "正在探索适合自己的职业方向",
      preferredLocations: cities.split(/[,，、]/).map((v) => v.trim()).filter(Boolean),
      workMode,
      salaryMinMonthly: salaryPreference === "range" ? Math.max(0, Number(salaryMin) || 0) : undefined,
      salaryMaxMonthly: salaryPreference === "range" ? Math.max(0, Number(salaryMax) || 0) : undefined,
      salaryPreference,
    },
  }), [education, years, stage, cities, workMode, salaryMin, salaryMax, salaryPreference]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (salaryPreference === "range" && Number(salaryMin) > Number(salaryMax)) {
      setError("最高月薪应大于或等于最低月薪。");
      return;
    }

    const identity = {
      name: name.trim() || "我的资料",
      headline: headline.trim() || "正在探索新的职业方向",
      minSalary: salaryPreference !== "range" ? 0 : Math.max(0, Number(salaryMin) || 0) * 12,
    };
    const searchCities = career.basics.preferredLocations.map((city, i) =>
      createSearchCity(city, i === 0 ? "主要求职城市" : "求职城市", "onboard-" + (i + 1)),
    );
    const nextProfile: Profile = deriveLegacyProfile(career, identity);

    setBusy(true);
    setError("");

    const result = await saveProfile({
      identity,
      career,
      searchCities,
      onboardingComplete: true,
    });

    if (result.error) {
      setBusy(false);
      setError(result.error);
      return;
    }

    updateCareer(career);
    updateProfile(nextProfile);
    replaceSearchCities(searchCities);
    await refreshProfile();
    setBusy(false);
    void navigate({ to: "/", replace: true });
  };

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center bg-white text-sm text-ink/50">正在准备你的职业工作台…</div>;
  }

  if (profileComplete) {
    void navigate({ to: "/", replace: true });
    return null;
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-ink sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-ink text-cream"><Sparkles className="size-4" /></div>
          <div>
            <div className="font-display text-lg font-extrabold">Solstice</div>
            <div className="text-[9px] font-bold tracking-[0.2em] text-ink/35 uppercase">建立你的求职画像</div>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-[0_25px_90px_rgba(38,31,8,0.09)] lg:grid-cols-[0.74fr_1.26fr]">
          <section className="yellow-grain p-7 sm:p-9">
            <div className="text-[10px] font-bold tracking-[0.24em] text-ochre uppercase">01 · 先建立最小可用画像</div>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">先告诉我你是谁，<br />以及你想去哪里。</h1>
            <p className="mt-4 text-sm leading-7 text-ink/55">这些信息会直接影响岗位理解、匹配分数和今日推荐。以后都可以在「我的资料」继续细化。</p>
            <div className="mt-8 space-y-2">
              {["姓名 / 显示名", "工作年限与职业阶段", "求职城市与工作方式", "期望月薪（税前）"].map((item, i) => (
                <div key={item} className="rounded-xl border border-ink/8 bg-white/70 px-3 py-2.5 text-xs font-semibold">
                  <span className="mr-2 text-ochre">0{i + 1}</span>{item}
                </div>
              ))}
            </div>
          </section>

          <section className="p-7 sm:p-9">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="你的名字 / 显示名" icon={<BriefcaseBusiness className="size-3.5 text-ochre" />}>
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：小林（仅用于显示）" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
                <Field label="一句话职业定位">
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="例如：希望从事产品、设计或内容相关工作" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="工作年限">
                  <input type="number" min={0} max={40} step={0.5} value={years} onChange={(e) => setYears(e.target.value)} placeholder="例如：1 或 3.5" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
                <Field label="职业阶段">
                  <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="例如：应届毕业 / 转行中 / 寻求进阶" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
                <Field label="学历">
                  <input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="例如：本科 / 大专 / 硕士" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
              </div>

              <Field label="求职城市（可以填多个，用逗号分隔）" icon={<MapPin className="size-3.5 text-ochre" />}>
                <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="例如：深圳、广州；也可填多个城市" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
              </Field>

              <div>
                <div className="mb-2 text-xs font-bold text-ink/50">工作方式</div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(modeLabels) as Array<WorkMode | "any">).map((mode) => (
                    <button key={mode} type="button" onClick={() => setWorkMode(mode)} className={"rounded-xl border px-2 py-2.5 text-xs font-extrabold transition " + (workMode === mode ? "border-ink bg-ink text-cream" : "border-ink/10 bg-white text-ink/50 hover:border-ochre/40 hover:bg-ochre/8")}>
                      {modeLabels[mode]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-ink/10 p-4">
                <div className="mb-3">
                  <div className="text-sm font-bold text-ink">期望月薪 <span className="ml-1 text-xs font-medium text-ink/45">税前 · 人民币</span></div>
                  <p className="mt-1 text-xs leading-5 text-ink/45">可以填写一个范围，也可以暂时不设限制。</p>
                </div>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {([{value:"range",label:"填写范围"},{value:"negotiable",label:"薪资可协商"},{value:"unlimited",label:"暂不限定"}] as const).map((option) => (
                    <button key={option.value} type="button" onClick={() => setSalaryPreference(option.value)} className={"rounded-xl border px-2 py-2.5 text-xs font-bold transition " + (salaryPreference === option.value ? "border-ink bg-ink text-white" : "border-ink/10 bg-white text-ink/60 hover:border-ink/25")}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {salaryPreference === "range" ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="最低月薪">
                        <div className="flex items-center rounded-xl border border-ink/10 bg-white px-3 focus-within:border-ochre">
                          <span className="text-sm text-ink/40">¥</span>
                          <input aria-label="最低月薪（税前）" type="number" min={0} step={500} required value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="8000" className="w-full min-w-0 bg-transparent px-2 py-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/30" />
                        </div>
                      </Field>
                      <Field label="最高月薪">
                        <div className="flex items-center rounded-xl border border-ink/10 bg-white px-3 focus-within:border-ochre">
                          <span className="text-sm text-ink/40">¥</span>
                          <input aria-label="最高月薪（税前）" type="number" min={0} step={500} required value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="12000" className="w-full min-w-0 bg-transparent px-2 py-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/30" />
                        </div>
                      </Field>
                    </div>
                    <p className="mt-2 text-[11px] text-ink/40">示例：¥8,000–12,000 元/月</p>
                  </>
                ) : (
                  <p className="rounded-xl bg-[#F8F8F5] px-3 py-2.5 text-xs leading-5 text-ink/55">
                    {salaryPreference === "negotiable" ? "薪资可根据岗位职责、成长空间和整体待遇进一步沟通。" : "暂时不以薪资范围筛选，优先了解岗位内容与发展机会。"}
                  </p>
                )}
                {salaryPreference === "range" && Number(salaryMin) > Number(salaryMax) ? <p className="mt-2 text-xs text-red-600">最高月薪应大于或等于最低月薪。</p> : null}
              </div>

              {error ? <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs font-semibold text-destructive">{error}</div> : null}

              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-extrabold text-cream shadow-sm transition hover:-translate-y-0.5 hover:bg-ink/90 disabled:opacity-50">
                {busy ? "正在保存…" : "保存职业画像并进入 Solstice"}
                <ArrowRight className="size-4 text-ochre" />
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink/50">{icon}{label}</span>
      {children}
    </label>
  );
}

const fieldClass = "w-full rounded-xl border border-ink/10 bg-white px-3.5 py-3 text-sm font-semibold text-ink outline-none transition focus:border-ochre focus:ring-2 focus:ring-ochre/15";
