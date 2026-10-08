import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { effectiveJobLifecycle } from "@/lib/job-lifecycle";
import { formatSalary, labelMode } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/hidden")({
  head: () => ({
    meta: [
      { title: "Hidden Jobs — Match Me Clever" },
      {
        name: "description",
        content: "Review jobs you hid and restore any listing to your matching queue.",
      },
    ],
  }),
  component: HiddenJobsPage,
});

function lifecycleLabel(status: ReturnType<typeof effectiveJobLifecycle>) {
  return {
    active: "Active",
    discovered: "New",
    stale: "Stale",
    closed: "Closed",
    expired: "Expired",
  }[status];
}

function HiddenJobsPage() {
  const { hiddenJobIds, jobs, unhideJob } = useWorkspace();
  const hiddenJobs = jobs.filter((job) => hiddenJobIds.includes(job.id));

  return (
    <AppShell>
      <PageHeading
        eyebrow="Hidden"
        title={`${hiddenJobs.length} hidden jobs`}
        description="Hidden is reversible. The listing stays in your local workspace so you can restore it later."
        action={
          <Link
            to="/matching"
            className="rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            Back to matching
          </Link>
        }
      />

      <div className="space-y-3">
        {hiddenJobs.map((job) => {
          const lifecycle = effectiveJobLifecycle(job.lifecycle, job.raw);
          return (
            <div key={job.id} className="rounded-2xl border border-ink/10 bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/jobs/$jobId"
                      params={{ jobId: job.id }}
                      className="font-display font-bold hover:text-azure"
                    >
                      {job.titleOriginal ?? job.title}
                    </Link>
                    <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-semibold text-ink/60">
                      {lifecycleLabel(lifecycle)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-ink/55">
                    {job.company} · {job.location} · {labelMode(job.workMode)} ·{" "}
                    {job.salaryNote ?? `${formatSalary(job.salaryMin)}–${formatSalary(job.salaryMax)}`}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/jobs/$jobId"
                    params={{ jobId: job.id }}
                    className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:bg-sand"
                  >
                    Review
                  </Link>
                  {job.sourceUrl ? (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-azure/30 px-3 py-1.5 text-xs font-semibold text-azure hover:bg-azure/8"
                    >
                      Original ↗
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => unhideJob(job.id)}
                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
                  >
                    Restore
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {hiddenJobs.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-card p-8 text-center">
            <p className="text-sm text-ink/60">No hidden jobs yet.</p>
            <Link
              to="/matching"
              className="mt-4 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
            >
              Browse matches
            </Link>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
