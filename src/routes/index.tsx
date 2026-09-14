import { Link, createFileRoute } from "@tanstack/react-router";

import office from "@/assets/office.jpg";
import { AppShell } from "@/components/app-shell";
import { BreakdownGrid, MatchRow, ScoreBar } from "@/components/match-parts";
import { formatSalary, labelMode, rankJobs } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";

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
  const { profile, jobs, activity, applications, saved } = useWorkspace();
  const ranked = rankJobs(profile, jobs);
  const top = ranked[0];
  const next = ranked.slice(1, 3);
  const today = new Date().toLocaleDateString(undefined, {
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
          <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-sand p-7">
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-[0.3em] text-azure uppercase">
                  {today}
                </div>
                <h1 className="font-display text-4xl leading-none font-extrabold">
                  Good morning, {profile.name.split(" ")[0]}
                </h1>
                <p className="mt-3 max-w-md text-ink/70">
                  {fresh} roles posted in the last two days were scored against your profile. Your
                  strongest fit right now is {top.score}%.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/today"
                  className="rounded-xl bg-azure px-5 py-3 font-display font-bold text-cream transition-colors hover:bg-azure-deep"
                >
                  Review today's matches
                </Link>
                <Link
                  to="/profile"
                  className="rounded-xl border border-ink/20 px-5 py-3 font-semibold transition-colors hover:bg-card/60"
                >
                  Update profile
                </Link>
              </div>
            </div>
            <div className="absolute -right-8 -bottom-12 h-52 w-52 rounded-full bg-ochre/25" />
            <div className="absolute right-16 -bottom-16 h-40 w-40 rounded-full bg-azure/15" />
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
                  Today's top match
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-ochre" />
              </div>
              <div className="text-xs font-semibold text-azure">{top.score}% match</div>
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
                    {top.job.title}
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
                      <span className="text-ink/60">Why this fits you</span>
                      <span className="font-semibold text-azure">{top.score}%</span>
                    </div>
                    <ScoreBar value={top.score} />
                  </div>
                  <div className="border-l-2 border-ochre pl-3 text-[13px] leading-relaxed text-ink/70">
                    {top.summary} {top.reasons[0]}
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
              <div className="text-sm font-semibold">AI Career Matching</div>
              <div className="text-xs text-ink/55">
                Scored {jobs.length} open roles against {profile.skills.length} weighted skills
              </div>
            </div>
            <Link to="/matching" className="text-sm font-semibold text-azure hover:text-azure-deep">
              Open matching
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Applications" value={applications.length} note={`${inReview} in review`} />
            <StatCard label="Interviews" value={interviews} note="Scheduled" tone="azure" />
            <StatCard label="Offers" value={offers} note="In hand" tone="ochre" />
          </div>

          <div className="space-y-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">More matches for you</h2>
              <Link to="/matching" className="text-sm font-semibold text-azure">
                View all {ranked.length}
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
              Activity log
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
                  <div className="text-xs text-cream/50">{relative(entry.at)}</div>
                </div>
              ))}
            </div>
            <Link
              to="/activity"
              className="mt-5 inline-block text-xs font-semibold text-ochre-soft hover:text-ochre"
            >
              Full log →
            </Link>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-card p-6">
            <div className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              Score breakdown — top match
            </div>
            <BreakdownGrid match={top} />
          </div>

          <div className="rounded-2xl bg-sand p-6">
            <div className="mb-3 text-[11px] font-semibold tracking-[0.25em] text-ink/50 uppercase">
              Saved jobs
            </div>
            <div className="space-y-3 text-sm">
              {savedJobs.length === 0 ? (
                <p className="text-ink/55">Nothing saved yet.</p>
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
              View all saved
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
      <div className="text-[11px] font-semibold tracking-[0.2em] text-ink/50 uppercase">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
      <div className={`mt-1 text-xs font-semibold ${color}`}>{note}</div>
    </div>
  );
}

export function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `Today · ${new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  if (hours < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
