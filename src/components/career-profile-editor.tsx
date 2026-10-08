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
  "w-full rounded-xl border border-ink/12 bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-azure focus:ring-2 focus:ring-azure/10";

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
    <section className="rounded-2xl border border-ink/10 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {hint ? <p className="mt-1 mb-4 text-xs text-ink/55">{hint}</p> : <div className="mb-4" />}
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
    <div className="flex items-center gap-3 rounded-xl bg-sand/70 px-3 py-2">
      <span className="w-36 shrink-0 text-xs font-semibold text-ink/70">{label}</span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as Rating)}
        className="h-1.5 flex-1 accent-azure"
      />
      <span className="w-6 rounded-md bg-ochre/25 py-0.5 text-center text-[10px] font-extrabold text-ink">{value}</span>
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
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-ink/40 hover:bg-destructive/5 hover:text-destructive"
          >
            删除
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...values, ""])}
        className="w-full rounded-xl border border-azure/20 bg-azure/5 py-2.5 text-xs font-semibold text-azure transition hover:bg-azure/10"
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
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-r from-ochre/20 via-white to-ink/5 p-4 shadow-sm">
        <div>
          <div className="font-display text-lg font-bold">职业档案</div>
          <p className="text-sm text-ink/65">
            AI 职业画像、职业方向和岗位匹配都会基于这里的信息。建议只填写真实、可验证的信息。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt ? <span className="text-xs text-sage">已保存于 {savedAt}</span> : null}
          <button
            onClick={save}
            className="rounded-xl bg-azure px-5 py-2.5 text-sm font-bold text-cream shadow-sm transition hover:bg-azure-deep"
          >
            保存资料
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
        hint="记录你已经掌握的能力。等级用于岗位匹配，不代表未来潜力。"
      >
        <div className="space-y-2">
          {draft.skills.map((skill, i) => (
            <div key={skill.id} className="rounded-xl border border-ink/8 bg-surface/70 p-3 transition hover:border-azure/20">
              <div className="grid gap-2 sm:grid-cols-[minmax(180px,1.6fr)_minmax(120px,1fr)_80px_minmax(120px,1fr)_auto] sm:items-end">
                <Field label="技能">
                  <input
                    value={skill.name}
                    onChange={(e) => setSkill(i, { name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
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
                    className="mt-2 h-1.5 w-full accent-ochre"
                  />
                </Field>
                <button
                  onClick={() =>
                    set(
                      "skills",
                      draft.skills.filter((_, idx) => idx !== i),
                    )
                  }
                  className="mb-1 text-xs font-semibold text-ink/40 hover:text-destructive"
                >
                  删除
                </button>
              </div>
              {skill.nameOriginal ? (
                <div className="mt-1 text-[10px] text-ink/40">原名：{skill.nameOriginal}</div>
              ) : null}
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
          className="mt-4 w-full rounded-xl border border-azure/20 bg-azure/5 py-2.5 text-xs font-semibold text-azure transition hover:bg-azure/10"
        >
          添加技能
        </button>
      </Section>

      <Section
        title="C · 经历证据"
        hint="记录真实经历、成果和可被岗位匹配引用的证据。"
      >
        <div className="space-y-2">
          {draft.evidence.map((item, i) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-xl border border-ink/10 p-4 sm:grid-cols-2"
            >
              <Field label="成果">
                <input
                  value={item.label}
                  onChange={(e) => set经历证据(i, { label: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="具体说明">
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
          className="mt-4 w-full rounded-xl border border-azure/20 bg-azure/5 py-2.5 text-xs font-semibold text-azure transition hover:bg-azure/10"
        >
          添加经历证据
        </button>
      </Section>

      <Section title="D · 工作偏好" hint="1 = 不重要，5 = 非常重要。">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-ink/60">工作内容偏好</div>
            {(
              [
                ["创造力", "creativity"],
                ["沟通协作", "communication"],
                ["分析能力", "analysis"],
                ["执行力", "execution"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.workContent[key]}
                onChange={(v) => set("workContent", { ...draft.workContent, [key]: v })}
              />
            ))}
            <div className="pt-3 text-xs font-semibold text-ink/60">工作方式偏好</div>
            {(
              [
                ["远程", "remote"],
                ["混合办公", "hybrid"],
                ["现场办公", "onsite"],
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
            <div className="text-xs font-semibold text-ink/60">职业优先级</div>
            {(
              [
                ["成长空间", "growth"],
                ["行业前景", "industryOutlook"],
                ["技能迁移", "transferableSkills"],
                ["薪资", "salary"],
                ["工作时间", "workingHours"],
                ["稳定性", "stability"],
              ] as const
            ).map(([label, key]) => (
              <RatingRow
                key={key}
                label={label}
                value={draft.priorities[key]}
                onChange={(v) => set("priorities", { ...draft.priorities, [key]: v })}
              />
            ))}
            <div className="pt-3 text-xs font-semibold text-ink/60">其他偏好</div>
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
        title="E · 不接受的工作条件"
        hint="严重条件会直接影响岗位推荐结果；岗位不会因此被隐藏。"
      >
        <div className="space-y-2">
          {draft.dealBreakers.map((breaker, i) => (
            <div key={breaker.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-3 py-2">
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
                className="rounded-lg border border-ink/12 bg-card px-2.5 py-2 text-xs font-semibold"
              >
                <option value="严重">严重</option>
                <option value="中等">中等</option>
              </select>
              <button
                onClick={() =>
                  set(
                    "dealBreakers",
                    draft.dealBreakers.filter((_, idx) => idx !== i),
                  )
                }
                className="rounded-lg px-2 py-1 text-xs font-semibold text-ink/40 hover:bg-destructive/5 hover:text-destructive"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="F · 学习与未来发展"
        hint="这里与已掌握技能分开：记录你想发展的方向，而不是已经具备的能力。"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                ["学习意愿", "willingness"],
                ["AI 兴趣", "ai"],
                ["编程兴趣", "programming"],
                ["自动化兴趣", "automation"],
                ["产品兴趣", "product"],
                ["内容创作兴趣", "content"],
                ["视觉 / 创意兴趣", "visual"],
                ["接受为成长承担一定不确定性", "uncertaintyTolerance"],
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
              想发展的技能
            </span>
            <ListEditor
              values={draft.learning.interestedSkills}
              onChange={(next) => set("learning", { ...draft.learning, interestedSkills: next })}
              placeholder="添加发展方向"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
