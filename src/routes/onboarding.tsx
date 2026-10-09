import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, MapPin, ChevronDown } from "lucide-react";

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
  const { user, loading, saveProfile, refreshProfile, profileComplete, signOut } = useAuth();
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
    <main className="solstice-onboarding min-h-screen px-4 py-8 text-ink sm:px-6">
      <div className="solstice-onboarding__frame mx-auto max-w-6xl">
        <div className="solstice-onboarding__top mb-6 flex items-center justify-between gap-3 pb-4">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              void navigate({ to: "/auth", replace: true });
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink/50 transition hover:bg-ink/5 hover:text-ink"
          >
            <ArrowLeft className="size-3.5" />
            返回登录 / 注册
          </button>
          <div className="text-right">
            <div className="solstice-wordmark solstice-wordmark--onboarding" aria-label="Solstice">Solstice<span className="solstice-wordmark__period">.</span></div>
            <div className="mt-0.5 text-[10px] font-semibold text-ink/35">建立你的求职画像</div>
          </div>
        </div>

        <div className="solstice-onboarding__panel grid overflow-hidden rounded-[2rem] lg:grid-cols-[0.74fr_1.26fr]">
          <section className="solstice-onboarding__story yellow-grain p-7 sm:p-9">
            <div className="text-[10px] font-bold tracking-[0.24em] text-ochre uppercase">开始之前 · 建立你的求职画像</div>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">从你现在的情况出发，找到更适合你的工作机会。</h1>
            <p className="mt-4 text-sm leading-7 text-ink/55">告诉我们目前你的职业方向、求职偏好和期待。Solstice 会结合这些信息理解岗位、分析匹配度，帮助你探索机会。</p>
            <div className="mt-8 rounded-2xl border border-ink/8 bg-white/70 p-4">
              <div className="text-xs font-bold text-ink/65">你将完善以下信息</div>
              <div className="mt-3 space-y-3">
                {["基本信息与职业方向", "工作经验与当前阶段", "求职城市与工作方式", "期望月薪与薪资偏好"].map((item, i) => (
                  <div key={item} className="flex items-center gap-3 text-xs font-semibold text-ink/70">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#F2EAD7] text-ochre">0{i + 1}</span>{item}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs leading-6 text-ink/40">不必一开始就想清楚所有答案。先填写目前确定的信息，之后可以随时调整。</p>
          </section>

          <section className="solstice-onboarding__form bg-white p-7 sm:p-9">
            <form onSubmit={submit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="你的名字 / 显示名" icon={<BriefcaseBusiness className="size-3.5 text-ink/50" />}>
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
                  <div className="relative">
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className={fieldClass + " appearance-none cursor-pointer pr-10"}
                      aria-label="选择职业阶段"
                    >
                      <option value="" disabled>请选择职业阶段</option>
                      {[
                        "在校 / 即将毕业",
                        "应届毕业 / 初入职场",
                        "有工作经验 / 继续发展",
                        "在职 / 考虑新机会",
                        "已离职 / 正在求职",
                        "转行 / 探索新方向",
                        "自由职业 / 项目工作",
                        "暂不确定",
                      ].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink/45">
                      <ChevronDown size={16} />
                    </span>
                  </div>
                </Field>
                <Field label="学历">
                  <input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="例如：本科 / 大专 / 硕士" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
                </Field>
              </div>

              <Field label="求职城市（可以填多个，用逗号分隔）" icon={<MapPin className="size-3.5 text-ink/50" />}>
                <input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="例如：深圳、广州；也可填多个城市" className={fieldClass + " placeholder:font-normal placeholder:text-ink/30"} />
              </Field>

              <div>
                <div className="mb-2 text-xs font-bold text-ink/50">工作方式</div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(modeLabels) as Array<WorkMode | "any">).map((mode) => (
                    <button key={mode} type="button" onClick={() => setWorkMode(mode)} className={"rounded-xl border px-2 py-2.5 text-xs font-extrabold transition " + (workMode === mode ? "border-ink bg-ink text-cream" : "border-ink/10 bg-white text-ink/50 hover:border-ink/20/40 hover:bg-ink/8")}>
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
                        <div className="flex items-center rounded-xl border border-ink/10 bg-white px-3 focus-within:border-ink/20">
                          <span className="text-sm text-ink/40">¥</span>
                          <input aria-label="最低月薪（税前）" type="number" min={0} step={500} required value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="8000" className="w-full min-w-0 bg-transparent px-2 py-3 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/30" />
                        </div>
                      </Field>
                      <Field label="最高月薪">
                        <div className="flex items-center rounded-xl border border-ink/10 bg-white px-3 focus-within:border-ink/20">
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

              <button disabled={busy} style={{ backgroundColor: "#211f18", color: "#ffffff", border: "1px solid #211f18" }} className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50">
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
