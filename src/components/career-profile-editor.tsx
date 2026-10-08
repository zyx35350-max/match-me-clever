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
  "w-full rounded-xl border border-ink/15 bg-card px-3 py-2 text-sm text-ink outline-none focus:border-azure";

const levels: Skill等级[] = ["learning", "working", "proficient", "advanced"];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink/10 bg-card p-4">
      <h2 className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">{title}</h2>
      {hint ? <p className="mt-1.5 mb-4 text-sm text-ink/60">{hint}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink/60">{label}</span>
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
    <div className="flex items-center gap-3">
      <span className="w-44 text-sm">{label}</span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Rating)}
        className="h-1 flex-1 accent-azure"
      />
      <span className="w-4 text-right text-sm font-semibold text-azure">{value}</span>
    </div>
  );
}

function ListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((value, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={value}
            onChange={(e) => onChange(values.map((v, idx) => (idx === i ? e.target.value : v)))}
            className={inputClass}
          />
          <button
            onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            className="shrink-0 px-2 text-xs font-semibold text-ink/40 hover:text-destructive"
          >
            删除
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...values, ""])}
        className="w-full rounded-lg border border-ink/20 py-2 text-xs font-semibold hover:bg-sand"
      >
        {placeholder}
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
    set(
      "skills",
      draft.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );

  const set经历证据 = (i: number, patch: Partial<经历证据Item>) =>
    set(
      "evidence",
      draft.evidence.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );

  const setBreaker = (i: number, patch: Partial<DealBreaker>) =>
    set(
      "dealBreakers",
      draft.dealBreakers.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
    );

  const save = () => {
    updateCareer(draft);
    setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand p-5">
        <div>
          <div className="font-display text-lg font-bold">结构化职业档案</div>
          <p className="text-sm text-ink/65">
            AI 职业画像、职业方向和岗位匹配都会基于这里的信息。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt ? <span className="text-xs text-sage">已保存于 {savedAt}</span> : null}
          <button
            onClick={save}
            className="rounded-xl bg-azure px-5 py-2.5 font-display font-bold text-cream hover:bg-azure-deep"
          >
            保存职业档案
          </button>
        </div>
      </div>

      <Section title="A · 基础资料">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="学历">
            <input
              value={draft.basics.education}
              onChange={(e) => set("basics", { ...draft.basics, education: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="工作年限">
            <input
              type="number"
              min={0}
              value={draft.basics.yearsExperience}
              onChange={(e) =>
                set("basics", { ...draft.basics, yearsExperience: Number(e.target.value) })
              }
              className={inputClass}
            />
          </Field>
          <Field label="当前职业阶段">
            <input
              value={draft.basics.careerStage}
              onChange={(e) => set("basics", { ...draft.basics, careerStage: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="接受异地/搬迁">
            <input
              value={draft.basics.relocation}
              onChange={(e) => set("basics", { ...draft.basics, relocation: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="工作方式偏好">
            <select
              value={draft.basics.workMode}
              onChange={(e) =>
                set("basics", {
                  ...draft.basics,
                  workMode: e.target.value as CareerProfile["basics"]["workMode"],
                })
              }
              className={inputClass}
            >
              {["remote", "hybrid", "onsite", "any"].map((m) => (
                <option key={m} value={m}>
                  {{ remote: "远程", hybrid: "混合办公", onsite: "现场办公", any: "不限" }[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">
              期望城市
            </span>
            <ListEditor
              values={draft.basics.preferredLocations}
              onChange={(next) => set("basics", { ...draft.basics, preferredLocations: next })}
              placeholder="添加城市"
            />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">语言</span>
            <ListEditor
              values={draft.basics.languages}
              onChange={(next) => set("basics", { ...draft.basics, languages: next })}
              placeholder="添加语言"
            />
          </div>
        </div>
      </Section>

      <Section
        title="B · 已掌握技能"
        hint="你已经掌握的能力，以及对应的经历证据。这里记录的是当前能力，不是未来潜力。"
      >
        <div className="space-y-2.5">
          {draft.skills.map((skill, i) => (
            <div key={skill.id} className="rounded-lg border border-ink/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={skill.name}
                  onChange={(e) => setSkill(i, { name: e.target.value })}
                  className={`${inputClass} max-w-xs`}
                />
                {skill.nameOriginal ? (
                  <span className="text-xs text-ink/45">{skill.nameOriginal}</span>
                ) : null}
                <button
                  onClick={() =>
                    set(
                      "skills",
                      draft.skills.filter((_, idx) => idx !== i),
                    )
                  }
                  className="ml-auto text-xs font-semibold text-ink/40 hover:text-destructive"
                >
                  删除
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Field label="等级">
                  <select
                    value={skill.level}
                    onChange={(e) => setSkill(i, { level: e.target.value as Skill等级 })}
                    className={inputClass}
                  >
                    {levels.map((l) => (
                      <option key={l} value={l}>
                        {{ learning: "学习中", working: "能独立工作", proficient: "熟练", advanced: "高级" }[l]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="年限">
                  <input
                    type="number"
                    min={0}
                    value={skill.years}
                    onChange={(e) => setSkill(i, { years: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label={`信心 — ${skill.confidence}/5`}>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={skill.confidence}
                    onChange={(e) => setSkill(i, { confidence: Number(e.target.value) as Rating })}
                    className="mt-2 h-1 w-full accent-ochre"
                  />
                </Field>
              </div>
              <Field label="经历证据">
                <input
                  value={skill.evidence}
                  onChange={(e) => setSkill(i, { evidence: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            set("skills", [
              ...draft.skills,
              {
                id: `skill-${Date.now()}`,
                name: "",
                level: "learning",
                evidence: "",
                years: 0,
                confidence: 2,
              },
            ])
          }
          className="mt-4 w-full rounded-lg border border-ink/20 py-2 text-xs font-semibold hover:bg-sand"
        >
          添加技能
        </button>
      </Section>

      <Section
        title="C · 经历证据 & achievements"
        hint="Structured proof the assistant can quote back to you."
      >
        <div className="space-y-2">
          {draft.evidence.map((item, i) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-xl border border-ink/10 p-4 sm:grid-cols-2"
            >
              <Field label="Achievement">
                <input
                  value={item.label}
                  onChange={(e) => set经历证据(i, { label: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Detail">
                <div className="flex gap-2">
                  <input
                    value={item.detail}
                    onChange={(e) => set经历证据(i, { detail: e.target.value })}
                    className={inputClass}
                  />
                  <button
                    onClick={() =>
                      set(
                        "evidence",
                        draft.evidence.filter((_, idx) => idx !== i),
                      )
                    }
                    className="shrink-0 px-2 text-xs font-semibold text-ink/40 hover:text-destructive"
                  >
                    删除
                  </button>
                </div>
              </Field>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            set("evidence", [...draft.evidence, { id: `ev-${Date.now()}`, label: "", detail: "" }])
          }
          className="mt-4 w-full rounded-lg border border-ink/20 py-2 text-xs font-semibold hover:bg-sand"
        >
          Add evidence
        </button>
      </Section>

      <Section title="D · Work preferences" hint="1 = not important, 5 = very important.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-ink/60">Work content</div>
            {(
              [
                ["Creativity", "creativity"],
                ["Communication", "communication"],
                ["Analysis", "analysis"],
                ["Execution", "execution"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.workContent[key]}
                onChange={(v) => set("workContent", { ...draft.workContent, [key]: v })}
              />
            ))}
            <div className="pt-3 text-xs font-semibold text-ink/60">Work style</div>
            {(
              [
                ["Remote", "remote"],
                ["Hybrid", "hybrid"],
                ["On-site", "onsite"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.workStyle[key]}
                onChange={(v) => set("workStyle", { ...draft.workStyle, [key]: v })}
              />
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-ink/60">Career priorities</div>
            {(
              [
                ["Growth potential", "growth"],
                ["Industry outlook", "industryOutlook"],
                ["Transferable skills", "transferableSkills"],
                ["Salary", "salary"],
                ["Working hours", "workingHours"],
                ["Stability", "stability"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.priorities[key]}
                onChange={(v) => set("priorities", { ...draft.priorities, [key]: v })}
              />
            ))}
            <div className="pt-3 text-xs font-semibold text-ink/60">Other preferences</div>
            {draft.otherPreferences.map((pref, i) => (
              <label key={pref.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  onChange={(e) =>
                    set(
                      "otherPreferences",
                      draft.otherPreferences.map((p, idx) =>
                        idx === i ? { ...p, enabled: e.target.checked } : p,
                      ),
                    )
                  }
                  className="accent-azure"
                />
                {pref.label}
              </label>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title="E · 不能接受的条件"
        hint="Severe deal breakers can mark a job Not Recommended — never hidden."
      >
        <div className="space-y-2">
          {draft.dealBreakers.map((breaker, i) => (
            <div key={breaker.id} className="flex flex-wrap items-center gap-2">
              <input
                value={breaker.label}
                onChange={(e) => setBreaker(i, { label: e.target.value })}
                className={`${inputClass} max-w-xs`}
              />
              <select
                value={breaker.severity}
                onChange={(e) =>
                  setBreaker(i, { severity: e.target.value as DealBreaker["severity"] })
                }
                className="rounded-lg border border-ink/15 bg-card px-2.5 py-2 text-xs font-semibold"
              >
                <option value="severe">severe</option>
                <option value="moderate">moderate</option>
              </select>
              <button
                onClick={() =>
                  set(
                    "dealBreakers",
                    draft.dealBreakers.filter((_, idx) => idx !== i),
                  )
                }
                className="text-xs font-semibold text-ink/40 hover:text-destructive"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="F · Learning & future potential"
        hint="Kept separate from proven skills on purpose — this is where you want to go, not what you've already done."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                ["Learning willingness", "willingness"],
                ["AI interest", "ai"],
                ["Programming interest", "programming"],
                ["Automation interest", "automation"],
                ["Product interest", "product"],
                ["Content interest", "content"],
                ["Visual / creative interest", "visual"],
                ["Accepts career uncertainty for growth", "uncertaintyTolerance"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.learning[key]}
                onChange={(v) => set("learning", { ...draft.learning, [key]: v })}
              />
            ))}
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink/60">
              Interested skills
            </span>
            <ListEditor
              values={draft.learning.interestedSkills}
              onChange={(next) => set("learning", { ...draft.learning, interestedSkills: next })}
              placeholder="Add interest"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
