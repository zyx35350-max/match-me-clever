import type { RawJob } from "./job-source-types";
import { deduplicateJobs } from "./job-dedup";
import { createJobLifecycle, touchJobLifecycle, type JobLifecycle } from "./job-lifecycle";

export interface JobRecord {
  raw: RawJob;
  lifecycle: JobLifecycle;
}

export interface JobDiscoveryPipelineResult {
  records: JobRecord[];
  duplicates: ReturnType<typeof deduplicateJobs>["duplicates"];
}

export interface JobDiscoveryStore {
  records: JobRecord[];
}

/**
 * V1.2.2 integration point.
 *
 * Discovery stays separate from matching: raw source records are deduplicated
 * and given lifecycle state before a later adapter converts them into the
 * existing Job model. No scraping, AI similarity, or UI changes happen here.
 */
export function ingestDiscoveredJobs(
  store: JobDiscoveryStore,
  incomingJobs: RawJob[],
): JobDiscoveryPipelineResult {
  const existingRawJobs = store.records.map((record) => record.raw);
  const deduped = deduplicateJobs(existingRawJobs, incomingJobs);
  const existingById = new Map(store.records.map((record) => [record.raw.id, record]));

  const nextRecords = [...store.records];

  for (const raw of deduped.uniqueJobs.slice(existingRawJobs.length)) {
    nextRecords.push({
      raw,
      lifecycle: createJobLifecycle(raw.fetchedAt),
    });
  }

  for (const raw of incomingJobs) {
    const existing = existingById.get(raw.id);
    if (!existing) continue;

    const refreshed = touchJobLifecycle(existing.lifecycle, raw.fetchedAt);
    const index = nextRecords.findIndex((record) => record.raw.id === raw.id);
    if (index >= 0) {
      nextRecords[index] = {
        raw,
        lifecycle: refreshed,
      };
    }
  }

  return {
    records: nextRecords,
    duplicates: deduped.duplicates,
  };
}
