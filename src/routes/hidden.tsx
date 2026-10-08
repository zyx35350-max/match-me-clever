import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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

type HiddenFilter = "all" | "active" | "stale" | "closed" | "expired";

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
  const { hiddenJobIds, jobs, importedJobRecords, unhideJob } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HiddenFilter>("all");
  const [page, setPage] = useState(1);

  const hiddenJobs = useMemo(
    () =>
      jobs
        .filter((job) => hiddenJobIds.includes(job.id))
        .map((job) => {
          const record = importedJobRecords.find((item) => item.raw.id === job.id);
          const lifecycle = effectiveJobLifecycle(record?.lifecycle, record?.raw);
          return { job, lifecycle };
        }),
    [jobs, hiddenJobIds, importedJobRecords],
  );

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return hiddenJobs.filter(({ job, lifecycle }) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && (lifecycle === "active" || lifecycle === "discovered")) ||
        lifecycle === filter;

      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [job.titleOriginal ?? job.title, job.company, job.location]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [hiddenJobs, query, filter]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleJobs = filteredJobs.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = useMemo(
    () => ({
      all: hiddenJobs.length,
      active: hiddenJobs.filter(
        ({ lifecycle }) => lifecycle === "active" || lifecycle === "discovered",
      ).length,
      stale: hiddenJobs.filter(({ lifecycle }) => lifecycle === "stale").length,
      closed: hiddenJobs.filter(({ lifecycle }) => lifecycle === "closed").length,
      expired: hiddenJobs.filter(({ lifecycle }) => lifecycle === "expired").length,
    }),
    [hiddenJobs],
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const updateFilter = (value: HiddenFilter) => {
    setFilter(value);
    setPage(1);
  };

  return (
    <AppShell>
      <PageHeading
        eyebrow="Hidden"
        title={hiddenJobs.length + " hidden jobs"}
        description="A compact archive of jobs you hid. Search, review, or restore them without deleting the original listing."
        action={
          <Link
            to="/matching"
            className="rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            Back to matching
          </Link>
        }
      />

      {hiddenJobs.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink/10 bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search title, company, or location…"
                  aria-label="Search hidden jobs"
                  className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-azure/50 focus:ring-2 focus:ring-azure/10"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => updateQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40 hover:text-ink"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["active", "Active"],
                    ["stale", "Stale"],
                    ["closed", "Closed"],
                    ["expired", "Expired"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateFilter(value)}
                    className={
                      filter === value
                        ? "rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-cream"
                        : "rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-sand"
                    }
                  >
                    {label}{" "}
                    <span className={filter === value ? "text-cream/60" : "text-ink/35"}>
                      {counts[value]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 text-xs text-ink/45">
              Showing {filteredJobs.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(
                safePage * pageSize,
                filteredJobs.length,
              )} of {filteredJobs.length}
            </div>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
              <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(140px,1fr)_120px_auto] gap-4 border-b border-ink/10 px-5 py-3 text-[10px] font-semibold tracking-[0.16em] text-ink/40 uppercase md:grid">
                <span>Job</span>
                <span>Company / Location</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <div className="divide-y divide-ink/8">
                {visibleJobs.map(({ job, lifecycle }) => (
                  <div
                    key={job.id}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-sand/45 md:grid-cols-[minmax(0,1.6fr)_minmax(140px,1fr)_120px_auto] md:items-center md:px-5"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="block truncate font-display text-sm font-bold hover:text-azure"
                        title={job.titleOriginal ?? job.title}
                      >
                        {job.titleOriginal ?? job.title}
                      </Link>
                      <div className="mt-1 text-xs text-ink/45">
                        {labelMode(job.workMode)} ·{" "}
                        {job.salaryNote ??
                          formatSalary(job.salaryMin) + "–" + formatSalary(job.salaryMax)}
                      </div>
                    </div>

                    <div className="min-w-0 text-xs text-ink/55">
                      <div className="truncate font-medium text-ink/70">{job.company}</div>
                      <div className="truncate">{job.location}</div>
                    </div>

                    <div>
                      <span className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-ink/55">
                        {lifecycleLabel(lifecycle)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="rounded-lg border border-ink/12 px-2.5 py-1.5 text-xs font-semibold hover:bg-cream"
                      >
                        Review
                      </Link>
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-azure/25 px-2.5 py-1.5 text-xs font-semibold text-azure hover:bg-azure/8"
                        >
                          Original ↗
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => unhideJob(job.id)}
                        className="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink/10 bg-card p-10 text-center">
              <p className="text-sm font-semibold">No hidden jobs match this view.</p>
              <p className="mt-1 text-xs text-ink/50">
                Try a different search term or status filter.
              </p>
            </div>
          )}

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
              >
                Previous
              </button>
              <span className="px-2 text-xs font-semibold text-ink/45">
                Page {safePage} of {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-ink/10 bg-card p-10 text-center">
          <p className="text-sm text-ink/60">No hidden jobs yet.</p>
          <Link
            to="/matching"
            className="mt-4 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream"
          >
            Browse matches
          </Link>
        </div>
      )}
    </AppShell>
  );
}
