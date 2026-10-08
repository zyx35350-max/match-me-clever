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
  const nextRecords = [...store.records];

  // Refresh existing records using stable source identity.
  for (const raw of incomingJobs) {
    const existingEntry = store.records
      .map((record, index) => ({ record, index }))
      .find(({ record }) => {
        const existing = record.raw;
        return (
          existing.id === raw.id ||
          (
            existing.sourceId === raw.sourceId &&
            !!existing.externalId &&
            !!raw.externalId &&
            existing.externalId.trim() === raw.externalId.trim()
          )
        );
      });

    if (!existingEntry) continue;

    const refreshed = touchJobLifecycle(existingEntry.record.lifecycle, raw.fetchedAt);
    nextRecords[existingEntry.index] = {
      raw,
      lifecycle: refreshed,
    };
  }

  // Add only genuinely new records.
  for (const raw of deduped.uniqueJobs) {
    const alreadyStored = nextRecords.some((record) =>
      record.raw.id === raw.id ||
      (
        record.raw.sourceId === raw.sourceId &&
        !!record.raw.externalId &&
        !!raw.externalId &&
        record.raw.externalId.trim() === raw.externalId.trim()
      ),
    );

    if (!alreadyStored) {
      nextRecords.push({
        raw,
        lifecycle: createJobLifecycle(raw.fetchedAt),
      });
    }
  }

  return {
    records: nextRecords,
    duplicates: deduped.duplicates,
  };
}
