import type { Job } from "./types";
import type { JobDiscoveryStore, JobRecord } from "./job-discovery-pipeline";
import { ingestDiscoveredJobs } from "./job-discovery-pipeline";
import { adaptRawJobToJob, type RawJobAdapterDefaults } from "./job-adapter";
import type { RawJob } from "./job-source-types";

export interface DiscoveredJobRecord {
  raw: RawJob;
  job: Job;
  lifecycle: JobRecord["lifecycle"];
  warnings: string[];
}

export interface JobDiscoveryAdapterResult {
  records: DiscoveredJobRecord[];
  duplicates: ReturnType<typeof ingestDiscoveredJobs>["duplicates"];
}

/**
 * V1.2.3 integration boundary:
 * RawJob -> dedup/lifecycle -> Job adapter.
 *
 * The returned Job objects are ready for the existing Career Engine. Source
 * records and lifecycle metadata remain available alongside them.
 */
export function ingestAndAdaptJobs(
  store: JobDiscoveryStore,
  incomingJobs: RawJob[],
  defaults?: RawJobAdapterDefaults,
): JobDiscoveryAdapterResult {
  const pipeline = ingestDiscoveredJobs(store, incomingJobs);

  return {
    records: pipeline.records.map((record) => {
      const adapted = defaults
        ? adaptRawJobToJob(record.raw, { lifecycle: record.lifecycle, defaults })
        : adaptRawJobToJob(record.raw, { lifecycle: record.lifecycle });

      return {
        raw: adapted.raw,
        job: adapted.job,
        lifecycle: record.lifecycle,
        warnings: adapted.warnings,
      };
    }),
    duplicates: pipeline.duplicates,
  };
}
