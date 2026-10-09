import { Link, createFileRoute } from "@tanstack/react-router";

import office from "@/assets/office.jpg";
import { AppShell } from "@/components/app-shell";
import { BreakdownGrid, MatchRow, ScoreBar } from "@/components/match-parts";
import { formatSalary, labelMode } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";
import { useCareer } from "@/lib/use-career";
import { feedbackLabel } from "@/lib/career-engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Solstice AI Job Search" },
      {
        name: "description",
        content:
          "Your personal AI job search dashboard: today's matched roles, match scores, saved jobs and application activity in one place.",
      },
      { property: "og:title", content: "Dashboard — Solstice AI Job Search" },
      {
        property: "og:description",
        content: "Today's matched roles, match scores, saved jobs and application activity.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    profile,
    jobs,
    activity,
    applications,
    saved,
    feedback,
    suggestions,
    acceptSuggestion,
    dismissSuggestion,
    hydrated,
  } = useWorkspace();
  // One authoritative ranking, shared with Today, Matching, Saved and details.
  const { matches, topDirection, aiProfile } = useCareer();
  const todayPicks = matches
    .filter((m) => m.job.postedDaysAgo <= 3 && !m.notRecommended)
    .slice(0, 2);
  const ranked = matches;
  const top = ranked[0];
  const next = ranked.slice(1, 3);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fresh = ranked.filter((m) => m.job.postedDaysAgo <= 2).length;
  const inReview = applications.filter((a) => a.status === "in_review").length;
  const interviews = applications.filter((a) => a.status === "interview").length;
  const offers = applications.filter((a) => a.status === "offer").length;
  const savedJobs = saved
    .map((id) => jobs.find((j) => j.id === id))
    .filter((j): j is NonNullable<typeof j> => Boolean(j))
    .slice(0, 3);

  if (!top) {
    return (
      <AppShell>
        <p className="rounded-2xl border border-ink/10 bg-card p-6 text-sm text-ink/60">
          No roles to score yet.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-8">
          <div className="solstice-hero animate-fade-up relative overflow-hidden rounded-[28px] bg-sand p-7 md:p-9">
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-[0.3em] text-azure uppercase">
                  今日 · {today}
                </div>
                <h1 className="font-display text-4xl leading-none font-extrabold">
                  你的 AI 求职工作台
                </h1>
                <p className="mt-3 max-w-md text-ink/70">
                  最近两天有 {fresh} 个新岗位完成匹配分析。当前岗位适配度为 {top.immediateFit}，职业成长价值为 {top.careerGrowthValue}。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/today"
                  className="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep"
                >
                  查看今日推荐
                </Link>
                <Link
                  to="/profile"
                  className="rounded-xl border border-ink/20 px-5 py-3 font-semibold transition-colors hover:bg-card/60"
                >
                  完善我的资料
                </Link>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-12 h-52 w-52 rounded-full bg-ochre/25" />
            <div className="absolute right-16 -bottom-16 h-40 w-40 rounded-full bg-azure/15" />
          </div>

          <div className="solstice-feature-card rounded-[24px] border border-ink/10 bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
                  当前优先推荐
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-ochre" />
              </div>
              <div className="text-xs font-semibold text-azure">综合匹配 {top.overall}%</div>
            </div>
            <div className="flex flex-col gap-5 sm:flex-row">
              <img
                src={office}
                alt=""
                loading="lazy"
                width={1184}
                height={560}
                className="h-40 shrink-0 rounded-xl object-cover sm:h-44 sm:w-48"
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: top.job.id }}
                    className="font-display text-xl font-bold hover:text-azure"
                  >
                    {top.job.titleOriginal ?? top.job.title}
                  </Link>
                  <span className="rounded-full bg-sage/20 px-2 py-0.5 text-xs font-semibold text-sage">
                    {labelMode(top.job.workMode)}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-ink/60">
                  {top.job.company} · {top.job.location} · {formatSalary(top.job.salaryMin)}–
                  {formatSalary(top.job.salaryMax)}
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-medium">
                      <span className="text-ink/60">
                        岗位适配 {top.immediateFit} · 成长价值 {top.careerGrowthValue}
                      </span>
                      <span className="font-semibold text-azure">{top.overall}%</span>
                    </div>
                    <ScoreBar value={top.overall} />
                  </div>
                  <div className="border-l-2 border-ochre pl-3 text-[13px] leading-relaxed text-ink/70">
                    {top.explanation.fits[0]} {top.explanation.tradeoff}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-card/60 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-sand font-display text-lg font-extrabold text-ochre">
              AI
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">AI 岗位匹配分析</div>
              <div className="text-xs text-ink/55">
                已分析 {jobs.length} 个岗位，结合 {profile.skills.length} 项个人能力
              </div>
            </div>
            <Link to="/matching" className="text-sm font-semibold text-azure hover:text-azure-deep">
              查看岗位匹配
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="已投递"
              value={applications.length}
              note={`${inReview} 个等待反馈`}
            />
            <StatCard label="面试中" value={interviews} note="正在推进" tone="azure" />
            <StatCard label="已获 Offer" value={offers} note="收获结果" tone="ochre" />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              AI 职业洞察
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink/75">
              Your strongest current advantage is the combination of e-commerce operations, product
              research and hands-on AI tools. You have strong transferable skills for AI-related
              roles, but formal AI project evidence is currently a gap.
            </p>
            <p className="mt-3 text-sm text-ink/65">
              <span className="font-semibold">当前值得探索的方向：</span>{" "}
              {topDirection
                ? `${topDirection.direction.name} (${topDirection.score}/100 AI assessment)`
                : "—"}
            </p>
            <p className="mt-2 text-xs text-ink/55">{aiProfile.identityHypothesis}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/directions"
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
              >
                探索职业方向
              </Link>
              <Link
                to="/matching"
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand"
              >
                查看能力画像
              </Link>
            </div>
          </div>

          {suggestions.length ? (
            <div className="rounded-2xl border border-azure/30 bg-azure/8 p-5">
              {suggestions.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-sm font-semibold">{s.message}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptSuggestion(s)}
                      className="rounded-lg bg-azure px-3 py-1.5 text-xs font-semibold text-cream"
                    >
                      采纳建议
                    </button>
                    <button
                      onClick={() => dismissSuggestion(s.id)}
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold"
                    >
                      暂时保留
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">今日推荐岗位</h2>
              <Link to="/today" className="text-sm font-semibold text-azure">
                查看全部
              </Link>
            </div>
            {todayPicks.map((m) => (
              <div
                key={m.job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-card p-5"
              >
                <div className="min-w-[220px] flex-1">
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: m.job.id }}
                    className="font-display font-bold hover:text-azure"
                  >
                    {m.job.titleOriginal ?? m.job.title}
                  </Link>
                  <div className="text-xs text-ink/55">
                    {m.job.company} · {m.direction?.name ?? "Exploration"}
                  </div>
                  <p className="mt-1 text-[13px] text-ink/70">{m.explanation.recommendation}</p>
                </div>
                <div className="flex gap-5 text-right text-sm">
                  <div>
                    <div className="font-display text-lg font-bold text-azure">
                      {m.immediateFit}
                    </div>
                    <div className="text-[10px] tracking-[0.15em] text-ink/50 uppercase">Fit</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-ochre">
                      {m.careerGrowthValue}
                    </div>
                    <div className="text-[10px] tracking-[0.15em] text-ink/50 uppercase">
                      Growth
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-sand p-5">
            <div className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              最近的反馈
            </div>
            {feedback.length === 0 ? (
              <p className="mt-2 text-sm text-ink/60">
                还没有反馈。收藏、投递或标记“不适合”，AI 会逐步了解你的偏好。
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                {feedback.slice(0, 4).map((f) => (
                  <li key={f.id}>
                    {feedbackLabel(f.action)} — {f.jobTitle}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">更多匹配岗位</h2>
              <Link to="/matching" className="text-sm font-semibold text-azure">
                查看全部 {ranked.length} 个
              </Link>
            </div>
            {next.map((match) => (
              <MatchRow key={match.job.id} match={match} />
            ))}
          </div>
        </div>

        <aside className="col-span-12 space-y-6 lg:col-span-4">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-cream">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-ochre/30" />
            <div className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-cream/60 uppercase">
              最近动态
            </div>
            <div className="relative space-y-4 pl-5">
              <div className="absolute top-1 bottom-1 left-1.5 w-px bg-cream/20" />
              {activity.slice(0, 3).map((entry, i) => (
                <div key={entry.id} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 size-3 rounded-full ring-4 ring-ink ${
                      i === 0 ? "bg-ochre" : i === 1 ? "bg-azure" : "bg-sage"
                    }`}
                  />
                  <div className="text-sm font-semibold">{entry.label}</div>
                  <div className="text-xs text-cream/50">{hydrated ? relative(entry.at) : ""}</div>
                </div>
              ))}
            </div>
            <Link
              to="/activity"
              className="mt-5 inline-block text-xs font-semibold text-ochre-soft hover:text-ochre"
            >
              查看全部记录 →
            </Link>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <div className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              首选岗位 · 匹配度拆解
            </div>
            <BreakdownGrid match={top} />
          </div>

          <div className="rounded-2xl bg-sand p-6">
            <div className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              已收藏岗位
            </div>
            <div className="space-y-3 text-sm">
              {savedJobs.length === 0 ? (
                <p className="text-ink/55">暂时还没有收藏岗位。</p>
              ) : (
                savedJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: job.id }}
                      className="font-semibold hover:text-azure"
                    >
                      {job.title}
                    </Link>
                    <span className="text-xs text-ink/50">{job.company}</span>
                  </div>
                ))
              )}
            </div>
            <Link
              to="/saved"
              className="mt-4 block rounded-lg border border-ink/20 py-2 text-center text-xs font-semibold transition-colors hover:bg-card/60"
            >
              查看收藏列表
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "sage",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "sage" | "azure" | "ochre";
}) {
  const color = tone === "azure" ? "text-azure" : tone === "ochre" ? "text-ochre" : "text-sage";
  return (
    <div className="rounded-2xl border border-ink/10 bg-card p-5">
      <div className="text-[11px] font-semibold tracking-[0.2em] text-ink/50 uppercase">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
      <div className={`mt-1 text-xs font-semibold ${color}`}>{note}</div>
    </div>
  );
}

export function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24)
    return `今天 · ${new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  if (hours < 48) return "昨天";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
