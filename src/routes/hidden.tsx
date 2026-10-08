import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell, PageHeading } from "@/components/app-shell";
import { effectiveJobLifecycle } from "@/lib/job-lifecycle";
import { formatSalary, labelMode } from "@/lib/matching";
import { useWorkspace } from "@/lib/store";

export const Route = createFileRoute("/hidden")({
  head: () => ({
    meta: [
      { title: "已隐藏岗位 — Match Me Clever" },
      {
        name: "description",
        content: "查看你隐藏的岗位，并随时恢复到匹配列表。",
      },
    ],
  }),
  component: Hidden职位sPage,
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

function Hidden职位sPage() {
  const { hiddenJobIds, jobs, importedJobRecords, unhideJob } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HiddenFilter>("all");
  const [page, setPage] = useState(1);

  const hidden职位s = useMemo(
    () =>
      jobs
        .filter((job) => (hiddenJobIds ?? []).includes(job.id))
        .map((job) => {
          const record = importedJobRecords.find((item) => item.raw.id === job.id);
          const lifecycle = effectiveJobLifecycle(record?.lifecycle, record?.raw);
          return { job, lifecycle };
        }),
    [jobs, hiddenJobIds, importedJobRecords],
  );

  const filtered职位s = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return hidden职位s.filter(({ job, lifecycle }) => {
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
  }, [hidden职位s, query, filter]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered职位s.length / pageSize));
  const safe第 = Math.min(page, pageCount);
  const visible职位s = filtered职位s.slice((safe第 - 1) * pageSize, safe第 * pageSize);

  const counts = useMemo(
    () => ({
      all: hidden职位s.length,
      active: hidden职位s.filter(
        ({ lifecycle }) => lifecycle === "active" || lifecycle === "discovered",
      ).length,
      stale: hidden职位s.filter(({ lifecycle }) => lifecycle === "stale").length,
      closed: hidden职位s.filter(({ lifecycle }) => lifecycle === "closed").length,
      expired: hidden职位s.filter(({ lifecycle }) => lifecycle === "expired").length,
    }),
    [hidden职位s],
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
        eyebrow="已隐藏"
        title={hidden职位s.length + " 个已隐藏岗位"}
        description="你隐藏的岗位归档。可以搜索、查看或恢复，不会删除原始岗位。"
        action={
          <Link
            to="/matching"
            className="rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream hover:bg-azure-deep"
          >
            返回岗位匹配
          </Link>
        }
      />

      {hidden职位s.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink/10 bg-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="搜索职位、公司或地点…"
                  aria-label="Search 个已隐藏岗位"
                  className="w-full rounded-xl border border-ink/15 bg-cream px-4 py-2.5 pr-10 text-sm outline-none transition focus:border-azure/50 focus:ring-2 focus:ring-azure/10"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => updateQuery("")}
                    aria-label="清除搜索"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40 hover:text-ink"
                  >
                    ×
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["all", "全部"],
                    ["active", "有效"],
                    ["stale", "较旧"],
                    ["closed", "已关闭"],
                    ["expired", "已过期"],
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
              正在显示 {filtered职位s.length === 0 ? 0 : (safe第 - 1) * pageSize + 1}–{Math.min(
                safe第 * pageSize,
                filtered职位s.length,
              )} / {filtered职位s.length}
            </div>
          </div>

          {filtered职位s.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
              <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(140px,1fr)_120px_auto] gap-4 border-b border-ink/10 px-5 py-3 text-[10px] font-semibold tracking-[0.16em] text-ink/40 uppercase md:grid">
                <span>职位</span>
                <span>公司 / 地点</span>
                <span>状态</span>
                <span className="text-right">操作</span>
              </div>

              <div className="divide-y divide-ink/8">
                {visible职位s.map(({ job, lifecycle }) => (
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
                        查看
                      </Link>
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-azure/25 px-2.5 py-1.5 text-xs font-semibold text-azure hover:bg-azure/8"
                        >
                          原始页面 ↗
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => unhideJob(job.id)}
                        className="rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-cream hover:bg-azure-deep"
                      >
                        恢复
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink/10 bg-card p-10 text-center">
              <p className="text-sm font-semibold">No 个已隐藏岗位 match this view.</p>
              <p className="mt-1 text-xs text-ink/50">
                请尝试其他关键词或状态筛选。
              </p>
            </div>
          )}

          {pageCount > 1 ? (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={safe第 === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
              >
                上一页
              </button>
              <span className="px-2 text-xs font-semibold text-ink/45">
                第 {safe第} / {pageCount}
              </span>
              <button
                type="button"
                disabled={safe第 === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                className="rounded-lg border border-ink/12 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
              >
                下一页
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-ink/10 bg-card p-10 text-center">
          <p className="text-sm text-ink/60">No 个已隐藏岗位 yet.</p>
          <Link
            to="/matching"
            className="mt-4 inline-block rounded-xl bg-azure px-4 py-2.5 text-sm font-semibold text-cream"
          >
            浏览匹配岗位
          </Link>
        </div>
      )}
    </AppShell>
  );
}
