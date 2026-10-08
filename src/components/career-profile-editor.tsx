import { useEffect, useState } from "react";

import { useWorkspace } from "@/lib/store";
import type {
  CareerProfile,
  DealBreaker,
  经历证据Item,
  ProvenSkill,
  Rating,
  Skill等级,
} from "@/lib/career-types";

const inputClass =
  "w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ochre focus:ring-2 focus:ring-ochre/10";

const levels: Skill等级[] = ["learning", "working", "proficient", "advanced"];

function Panel({
  number,
  title,
  hint,
  children,
  accent = false,
}: {
  number: string;
  title: string;
  hint: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-ink/8 bg-white p-4 shadow-sm md:p-5 ${
        accent ? "yellow-grain" : ""
      }`}
    >
      {accent ? <div className="absolute -right-10 -top-10 size-28 rounded-full bg-ochre/15 blur-2xl" /> : null}
      <div className="relative mb-4 flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-ink text-[10px] font-extrabold text-cream">
          {number}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink/45">{hint}</p>
        </div>
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-ink/50">{label}</span>
      {children}
    </label>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: Rating) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(58px,auto)_minmax(70px,1fr)_24px] items-center gap-2 rounded-lg border border-ink/7 bg-white px-2.5 py-2">
      <span className="truncate text-[10px] font-semibold text-ink/60">{label}</span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Rating)}
        className="profile-range" style={{ "--range-progress": `${((value - 1) / 4) * 100}%` } as React.CSSProperties}
      />
      <span className="grid size-5 place-items-center rounded-md bg-ochre/20 text-[9px] font-extrabold">
        {value}
      </span>
    </div>
  );
}

function ChipsEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, i) => (
        <div key={i} className="group flex items-center gap-1 rounded-lg border border-ink/8 bg-ink/[0.025] px-2 py-1">
          <input
            value={value}
            onChange={(e) => onChange(values.map((v, idx) => (idx === i ? e.target.value : v)))}
            className="w-20 bg-transparent text-xs font-semibold outline-none sm:w-24"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            className="text-[11px] font-bold text-ink/25 hover:text-destructive"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="rounded-lg border border-dashed border-ochre/35 bg-ochre/8 px-2.5 py-1.5 text-[11px] font-bold text-ink/45 hover:bg-ochre/15"
      >
        + {placeholder}
      </button>
    </div>
  );
}

export function CareerProfileEditor() {
  const { career, updateCareer, hydrated } = useWorkspace();
  const [draft, setDraft] = useState<CareerProfile>(career);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) setDraft(career);
  }, [hydrated, career]);

  const set = <K extends keyof CareerProfile>(key: K, value: CareerProfile[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setSkill = (i: number, patch: Partial<ProvenSkill>) =>
    set("skills", draft.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const setEvidence = (i: number, patch: Partial<经历证据Item>) =>
    set("evidence", draft.evidence.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const setBreaker = (i: number, patch: Partial<DealBreaker>) =>
    set("dealBreakers", draft.dealBreakers.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const save = () => {
    updateCareer(draft);
    setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="space-y-4">
      <div className="yellow-grain flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-ink/8 bg-white p-4 shadow-sm">
        <div>
          <div className="text-[10px] font-bold tracking-[0.18em] text-ochre uppercase">ADVANCED PROFILE</div>
          <div className="mt-1 font-display text-lg font-extrabold">详细职业资料</div>
          <p className="mt-0.5 text-xs text-ink/45">下面的信息主要用于 AI 理解你的能力、偏好和发展潜力。</p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt ? <span className="text-[11px] font-semibold text-sage">已保存 {savedAt}</span> : null}
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-cream shadow-sm transition hover:-translate-y-0.5"
          >
            保存并重新匹配
          </button>
        </div>
      </div>

      <Panel number="01" title="基础信息" hint="只保留会直接影响岗位筛选和匹配的基础条件。" accent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="学历"><input value={draft.basics.education} onChange={(e) => set("basics", { ...draft.basics, education: e.target.value })} className={inputClass} /></Field>
          <Field label="工作年限"><input type="number" min={0} value={draft.basics.yearsExperience} onChange={(e) => set("basics", { ...draft.basics, yearsExperience: Number(e.target.value) })} className={inputClass} /></Field>
          <Field label="职业阶段"><input value={draft.basics.careerStage} onChange={(e) => set("basics", { ...draft.basics, careerStage: e.target.value })} className={inputClass} /></Field>
          <Field label="异地 / 搬迁"><input value={draft.basics.relocation} onChange={(e) => set("basics", { ...draft.basics, relocation: e.target.value })} className={inputClass} /></Field>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
          <div><span className="mb-1 block text-[11px] font-bold text-ink/50">期望城市</span><ChipsEditor values={draft.basics.preferredLocations} onChange={(next) => set("basics", { ...draft.basics, preferredLocations: next })} placeholder="添加城市" /></div>
          <div><span className="mb-1 block text-[11px] font-bold text-ink/50">语言</span><ChipsEditor values={draft.basics.languages} onChange={(next) => set("basics", { ...draft.basics, languages: next })} placeholder="添加语言" /></div>
          <Field label="工作方式">
            <select value={draft.basics.workMode} onChange={(e) => set("basics", { ...draft.basics, workMode: e.target.value as CareerProfile["basics"]["workMode"] })} className={inputClass}>
              {["remote", "hybrid", "onsite", "any"].map((m) => <option key={m} value={m}>{{ remote: "远程", hybrid: "混合办公", onsite: "现场办公", any: "不限" }[m]}</option>)}
            </select>
          </Field>
        </div>
      </Panel>

      <Panel number="02" title="能力与经历" hint="把“会什么”和“做过什么”放在一起，避免重复填写。" accent>
        <div className="space-y-2">
          {draft.skills.map((skill, i) => (
            <div key={skill.id} className="rounded-xl border border-ink/8 bg-white px-3 py-2.5">
              <div className="grid gap-2 md:grid-cols-[minmax(150px,1.5fr)_130px_70px_minmax(100px,1fr)_auto] md:items-end">
                <Field label="技能"><input value={skill.name} onChange={(e) => setSkill(i, { name: e.target.value })} className={inputClass} /></Field>
                <Field label="等级">
                  <select value={skill.level} onChange={(e) => setSkill(i, { level: e.target.value as Skill等级 })} className={inputClass}>
                    {levels.map((l) => <option key={l} value={l}>{{ learning: "学习中", working: "能独立工作", proficient: "熟练", advanced: "高级" }[l]}</option>)}
                  </select>
                </Field>
                <Field label="年限"><input type="number" min={0} value={skill.years} onChange={(e) => setSkill(i, { years: Number(e.target.value) })} className={inputClass} /></Field>
                <Field label={`信心 · ${skill.confidence}/5`}><input type="range" min={1} max={5} value={skill.confidence} onChange={(e) => setSkill(i, { confidence: Number(e.target.value) as Rating })} className="profile-range" style={{ "--range-progress": `${((skill.confidence - 1) / 4) * 100}%` } as React.CSSProperties} /></Field>
                <button type="button" onClick={() => set("skills", draft.skills.filter((_, idx) => idx !== i))} className="mb-1 text-[11px] font-bold text-ink/30 hover:text-destructive">删除</button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
                <span className="text-[11px] font-bold text-ink/45">经历证据</span>
                <input value={skill.evidence} onChange={(e) => setSkill(i, { evidence: e.target.value })} className={inputClass} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => set("skills", [...draft.skills, { id: `skill-${Date.now()}`, name: "", level: "learning", evidence: "", years: 0, confidence: 2 }])} className="mt-3 rounded-lg border border-dashed border-ochre/35 bg-ochre/8 px-3 py-2 text-[11px] font-bold text-ink/50 hover:bg-ochre/15">+ 添加技能</button>

        <div className="mt-5 border-t border-ink/8 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div><div className="text-xs font-extrabold">成果证据</div><div className="text-[10px] text-ink/40">用于让 AI 在解释匹配结果时引用真实经历。</div></div>
            <button type="button" onClick={() => set("evidence", [...draft.evidence, { id: `ev-${Date.now()}`, label: "", detail: "" }])} className="rounded-lg bg-ochre/10 px-2.5 py-1.5 text-[11px] font-bold">+ 添加</button>
          </div>
          <div className="space-y-2">
            {draft.evidence.map((item, i) => (
              <div key={item.id} className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center">
                <input value={item.label} onChange={(e) => setEvidence(i, { label: e.target.value })} placeholder="成果 / 事件" className={inputClass} />
                <input value={item.detail} onChange={(e) => setEvidence(i, { detail: e.target.value })} placeholder="具体说明" className={inputClass} />
                <button type="button" onClick={() => set("evidence", draft.evidence.filter((_, idx) => idx !== i))} className="text-[11px] font-bold text-ink/30 hover:text-destructive">删除</button>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel number="03" title="工作偏好与底线" hint="把你希望做什么、重视什么，以及明确不能接受什么放在一起。">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-extrabold">工作内容</div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {([["创造力","creativity"],["沟通协作","communication"],["分析能力","analysis"],["执行力","execution"]] as const).map(([label,key]) => <RatingRow key={key} label={label} value={draft.workContent[key]} onChange={(v) => set("workContent", { ...draft.workContent, [key]: v })} />)}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-extrabold">职业优先级</div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {([["成长空间","growth"],["行业前景","industryOutlook"],["技能迁移","transferableSkills"],["薪资","salary"],["工作时间","workingHours"],["稳定性","stability"]] as const).map(([label,key]) => <RatingRow key={key} label={label} value={draft.priorities[key]} onChange={(v) => set("priorities", { ...draft.priorities, [key]: v })} />)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-extrabold">工作方式</div>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {([["远程","remote"],["混合","hybrid"],["现场","onsite"]] as const).map(([label,key]) => <RatingRow key={key} label={label} value={draft.workStyle[key]} onChange={(v) => set("workStyle", { ...draft.workStyle, [key]: v })} />)}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-extrabold">不能接受的条件</div>
              <div className="space-y-1.5">
                {draft.dealBreakers.map((breaker, i) => (
                  <div key={breaker.id} className="flex items-center gap-2">
                    <input value={breaker.label} onChange={(e) => setBreaker(i, { label: e.target.value })} className={`${inputClass} flex-1`} />
                    <select value={breaker.severity} onChange={(e) => setBreaker(i, { severity: e.target.value as DealBreaker["severity"] })} className="rounded-lg border border-ink/10 bg-white px-2 py-2 text-xs font-semibold">
                      <option value="严重">严重</option><option value="中等">中等</option>
                    </select>
                    <button type="button" onClick={() => set("dealBreakers", draft.dealBreakers.filter((_, idx) => idx !== i))} className="text-[11px] font-bold text-ink/30 hover:text-destructive">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {draft.otherPreferences.length ? (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-ink/8 pt-3">
            {draft.otherPreferences.map((pref, i) => (
              <label key={pref.id} className="flex items-center gap-1.5 text-xs font-semibold text-ink/55">
                <input type="checkbox" checked={pref.enabled} onChange={(e) => set("otherPreferences", draft.otherPreferences.map((p, idx) => idx === i ? { ...p, enabled: e.target.checked } : p))} className="accent-ochre" />
                {pref.label}
              </label>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel number="04" title="发展方向" hint="这里不再单独做一整块仪表盘，只记录你想发展的能力与兴趣倾向。" accent>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-2 text-xs font-extrabold">兴趣倾向</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {([["学习意愿","willingness"],["AI","ai"],["编程","programming"],["自动化","automation"],["产品","product"],["内容创作","content"],["视觉 / 创意","visual"],["接受成长不确定性","uncertaintyTolerance"]] as const).map(([label,key]) => <RatingRow key={key} label={label} value={draft.learning[key]} onChange={(v) => set("learning", { ...draft.learning, [key]: v })} />)}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-extrabold">想发展的技能</div>
            <ChipsEditor values={draft.learning.interestedSkills} onChange={(next) => set("learning", { ...draft.learning, interestedSkills: next })} placeholder="添加技能" />
          </div>
        </div>
      </Panel>
    </div>
  );
}
