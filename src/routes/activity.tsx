import { Link, createFileRoute } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/app-shell";
import { statusLabel, useWorkspace } from "@/lib/store";
import type { ApplicationStatus } from "@/lib/types";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Solstice" },
      {
        name: "description",
        content:
          "Every application, status change, save and profile edit in one chronological log, with the current stage of each application.",
      },
      { property: "og:title", content: "Activity Log — Solstice" },
      {
        property: "og:description",
        content: "A chronological log of applications, status changes, saves and profile edits.",
      },
    ],
  }),
  component: ActivityPage,
});

const statuses: ApplicationStatus[] = ["applied", "in_review", "interview", "offer", "rejected"];

function ActivityPage() {
  const { activity, applications, jobs, setStatus } = useWorkspace();

  return (
    <AppShell>
      <PageHeading
        eyebrow="Activity"
        title="Applications & log"
        description="Move an application along as things happen — each change lands in the log below."
      />

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
            <div className="grid grid-cols-[1fr_150px] gap-4 border-b border-ink/10 bg-sand/60 px-5 py-2.5 text-[10px] font-semibold tracking-[0.15em] text-ink/50 uppercase">
              <span>Application</span>
              <span>Stage</span>
            </div>
            {applications.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink/60">No applications logged yet.</p>
            ) : (
              applications.map((app) => {
                const job = jobs.find((j) => j.id === app.jobId);
                if (!job) return null;
                return (
                  <div
                    key={app.jobId}
                    className="grid grid-cols-[1fr_150px] items-center gap-4 border-b border-ink/10 px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/jobs/$jobId"
                        params={{ jobId: job.id }}
                        className="text-sm font-semibold hover:text-azure"
                      >
                        {job.title}
                      </Link>
                      <div className="text-xs text-ink/55">
                        {job.company} · applied{" "}
                        {new Date(app.appliedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <select
                      value={app.status}
                      onChange={(e) => setStatus(job, e.target.value as ApplicationStatus)}
                      className="rounded-lg border border-ink/15 bg-card px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-azure"
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-cream">
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-ochre/30" />
            <div className="mb-4 text-[11px] font-semibold tracking-[0.25em] text-cream/60 uppercase">
              Full log
            </div>
            <div className="relative space-y-4 pl-5">
              <div className="absolute top-1 bottom-1 left-1.5 w-px bg-cream/20" />
              {activity.map((entry) => (
                <div key={entry.id} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 size-3 rounded-full ring-4 ring-ink ${
                      entry.kind === "applied"
                        ? "bg-ochre"
                        : entry.kind === "status"
                          ? "bg-azure"
                          : "bg-sage"
                    }`}
                  />
                  <div className="text-sm font-semibold">{entry.label}</div>
                  <div className="text-xs text-cream/50">
                    {new Date(entry.at).toLocaleString(undefined, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
