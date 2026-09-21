import type { RawJob } from "./job-source-types";

export type JobLifecycleStatus = "discovered" | "active" | "stale" | "closed" | "expired";

export interface JobLifecycle {
  status: JobLifecycleStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  staleAt?: string;
  closedAt?: string;
  expiredAt?: string;
}

export function createJobLifecycle(
  firstSeenAt: string,
  status: JobLifecycleStatus = "discovered",
): JobLifecycle {
  return {
    status,
    firstSeenAt,
    lastSeenAt: firstSeenAt,
  };
}

export function touchJobLifecycle(lifecycle: JobLifecycle, seenAt: string): JobLifecycle {
  return {
    ...lifecycle,
    status:
      lifecycle.status === "closed" || lifecycle.status === "expired" ? lifecycle.status : "active",
    lastSeenAt: seenAt,
  };
}

export function markJobStale(lifecycle: JobLifecycle, staleAt: string): JobLifecycle {
  if (lifecycle.status === "closed" || lifecycle.status === "expired") {
    return lifecycle;
  }

  return {
    ...lifecycle,
    status: "stale",
    staleAt,
  };
}

export function closeJobLifecycle(lifecycle: JobLifecycle, closedAt: string): JobLifecycle {
  return {
    ...lifecycle,
    status: "closed",
    closedAt,
  };
}

export function expireJobLifecycle(lifecycle: JobLifecycle, expiredAt: string): JobLifecycle {
  return {
    ...lifecycle,
    status: "expired",
    expiredAt,
  };
}

export function getLifecycleKey(job: RawJob): string {
  if (job.externalId?.trim()) {
    return `${job.sourceId}:external:${job.externalId.trim()}`;
  }

  if (job.sourceUrl?.trim()) {
    return `${job.sourceId}:url:${normalizeUrl(job.sourceUrl)}`;
  }

  if (job.contentHash?.trim()) {
    return `${job.sourceId}:content:${job.contentHash.trim()}`;
  }

  return job.id;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
    return parsed.toString();
  } catch {
    return url.trim().replace(/\/$/, "").toLowerCase();
  }
}
