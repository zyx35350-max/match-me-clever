import type { RawJob } from "./job-source-types";

export type DedupMatchType =
  | "external_id"
  | "source_url"
  | "content_hash"
  | "exact_content"
  | "none";

export interface DedupMatch {
  duplicate: boolean;
  matchType: DedupMatchType;
  existingJobId?: string;
}

export interface DedupResult {
  uniqueJobs: RawJob[];
  duplicates: Array<{
    job: RawJob;
    existingJobId: string;
    matchType: Exclude<DedupMatchType, "none">;
  }>;
}

export function compareJobs(existing: RawJob, candidate: RawJob): DedupMatch {
  if (
    existing.sourceId === candidate.sourceId &&
    existing.externalId?.trim() &&
    candidate.externalId?.trim() &&
    existing.externalId.trim() === candidate.externalId.trim()
  ) {
    return {
      duplicate: true,
      matchType: "external_id",
      existingJobId: existing.id,
    };
  }

  if (
    existing.sourceId === candidate.sourceId &&
    existing.sourceUrl?.trim() &&
    candidate.sourceUrl?.trim() &&
    normalizeUrl(existing.sourceUrl) === normalizeUrl(candidate.sourceUrl)
  ) {
    return {
      duplicate: true,
      matchType: "source_url",
      existingJobId: existing.id,
    };
  }

  if (
    existing.sourceId === candidate.sourceId &&
    existing.contentHash?.trim() &&
    candidate.contentHash?.trim() &&
    existing.contentHash.trim() === candidate.contentHash.trim()
  ) {
    return {
      duplicate: true,
      matchType: "content_hash",
      existingJobId: existing.id,
    };
  }

  if (
    existing.sourceId === candidate.sourceId &&
    normalizeText(existing.rawTitle) === normalizeText(candidate.rawTitle) &&
    normalizeText(existing.rawDescription) === normalizeText(candidate.rawDescription)
  ) {
    return {
      duplicate: true,
      matchType: "exact_content",
      existingJobId: existing.id,
    };
  }

  return { duplicate: false, matchType: "none" };
}

export function deduplicateJobs(
  existingJobs: RawJob[],
  incomingJobs: RawJob[],
): DedupResult {
  const uniqueJobs = [...existingJobs];
  const duplicates: DedupResult["duplicates"] = [];

  for (const candidate of incomingJobs) {
    const match = uniqueJobs
      .map((existing) => compareJobs(existing, candidate))
      .find((result) => result.duplicate);

    if (match?.duplicate && match.existingJobId) {
      duplicates.push({
        job: candidate,
        existingJobId: match.existingJobId,
        matchType: match.matchType,
      });
      continue;
    }

    uniqueJobs.push(candidate);
  }

  return { uniqueJobs, duplicates };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
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
