import type {
  FetchResult,
  JobSource,
  JobSourceAdapter,
  RawJob,
} from "./job-source-types";

export const USER_IMPORT_SOURCE: JobSource = {
  id: "user-import",
  name: "User Import",
  type: "user_import",
  accessPolicy: "manual_import",
  enabled: true,
  description: "User-pasted or user-uploaded job information.",
};

export function createJobSource(
  input: Omit<JobSource, "enabled"> & { enabled?: boolean },
): JobSource {
  return {
    ...input,
    enabled: input.enabled ?? true,
  };
}

export function createRawJob(input: {
  source: JobSource;
  rawTitle: string;
  rawDescription: string;
  fetchedAt?: string;
  externalId?: string;
  sourceUrl?: string;
  companyName?: string;
  locationText?: string;
  contentHash?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): RawJob {
  return {
    id: buildRawJobId(input.source.id, input.externalId, input.rawTitle, input.rawDescription),
    sourceId: input.source.id,
    sourceType: input.source.type,
    ...(input.externalId ? { externalId: input.externalId } : {}),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    rawTitle: input.rawTitle,
    rawDescription: input.rawDescription,
    ...(input.companyName ? { companyName: input.companyName } : {}),
    ...(input.locationText ? { locationText: input.locationText } : {}),
    ...(input.contentHash ? { contentHash: input.contentHash } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

export function buildRawJobId(
  sourceId: string,
  externalId: string | undefined,
  title: string,
  description: string,
) {
  const identity = externalId?.trim() || title.trim() + "::" + description.trim();
  return "raw-" + stableHash(sourceId + "::" + identity);
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export const defaultJobSources: JobSource[] = [
  USER_IMPORT_SOURCE,
  createJobSource({
    id: "company-site",
    name: "Company Career Site",
    type: "company_site",
    accessPolicy: "unknown",
    enabled: false,
  }),
  createJobSource({
    id: "job-board",
    name: "Job Board",
    type: "job_board",
    accessPolicy: "unknown",
    enabled: false,
  }),
  createJobSource({
    id: "aggregator",
    name: "Job Aggregator",
    type: "aggregator",
    accessPolicy: "unknown",
    enabled: false,
  }),
];

export function sourceCanDiscover(source: JobSource) {
  return (
    source.enabled &&
    source.accessPolicy !== "restricted" &&
    source.accessPolicy !== "unknown"
  );
}

export function emptyFetchResult(
  source: JobSource,
  status: FetchResult["status"] = "pending",
): FetchResult {
  return {
    status,
    fetchedAt: new Date().toISOString(),
    sourceId: source.id,
    jobs: [],
  };
}

export class UnimplementedJobSourceAdapter implements JobSourceAdapter {
  readonly source: JobSource;

  constructor(source: JobSource) {
    this.source = source;
  }

  async discover(): Promise<FetchResult> {
    return {
      ...emptyFetchResult(this.source, "failed"),
      message: "No discovery adapter is implemented for this source yet.",
    };
  }
}
