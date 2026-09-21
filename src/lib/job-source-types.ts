/**
 * V1.2 Real Job Discovery foundation.
 *
 * This layer describes where a job came from and how it may be accessed.
 * It does not scrape, call external APIs, or make claims about platform access.
 */

export type JobSourceType =
  | "user_import"
  | "company_site"
  | "job_board"
  | "aggregator"
  | "api"
  | "licensed_feed"
  | "other";

export type AccessPolicy =
  | "manual_import"
  | "public_page"
  | "official_api"
  | "licensed_feed"
  | "restricted"
  | "unknown";

export type FetchStatus =
  | "pending"
  | "success"
  | "partial"
  | "not_found"
  | "blocked"
  | "rate_limited"
  | "unauthorized"
  | "failed";

export interface JobSource {
  id: string;
  name: string;
  type: JobSourceType;
  accessPolicy: AccessPolicy;
  enabled: boolean;
  description?: string;
}

export interface RawJob {
  id: string;
  sourceId: string;
  sourceType: JobSourceType;
  externalId?: string;
  sourceUrl?: string;
  fetchedAt: string;
  rawTitle: string;
  rawDescription: string;
  companyName?: string;
  locationText?: string;
  contentHash?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface FetchResult {
  status: FetchStatus;
  fetchedAt: string;
  sourceId: string;
  jobs: RawJob[];
  message?: string;
}

export interface JobSourceAdapter {
  readonly source: JobSource;
  discover(input?: unknown): Promise<FetchResult>;
}
