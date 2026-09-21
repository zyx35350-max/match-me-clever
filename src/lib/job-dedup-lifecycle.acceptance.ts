import assert from "node:assert/strict";
import { createRawJob, USER_IMPORT_SOURCE } from "./job-source";
import { compareJobs, deduplicateJobs } from "./job-dedup";
import {
  closeJobLifecycle,
  createJobLifecycle,
  expireJobLifecycle,
  getLifecycleKey,
  markJobStale,
  touchJobLifecycle,
} from "./job-lifecycle";

const base = {
  source: USER_IMPORT_SOURCE,
  rawTitle: "AI Visual Content Designer",
  rawDescription: "Create product visuals and short-form content.",
  companyName: "Example Studio",
};

function makeJob(overrides: Partial<Parameters<typeof createRawJob>[0]> = {}) {
  return createRawJob({
    ...base,
    ...overrides,
  });
}

async function main() {
  const original = makeJob({
    externalId: "job-1",
    sourceUrl: "https://example.com/jobs/1?utm_source=test#top",
    contentHash: "hash-1",
  });

  const sameExternalId = makeJob({
    externalId: "job-1",
    rawTitle: "Different title",
    rawDescription: "Different description",
  });
  assert.equal(compareJobs(original, sameExternalId).matchType, "external_id");

  const sameUrl = makeJob({
    externalId: "job-2",
    sourceUrl: "https://EXAMPLE.com/jobs/1?utm_campaign=other",
  });
  assert.equal(compareJobs(original, sameUrl).matchType, "source_url");

  const sameHash = makeJob({
    externalId: "job-3",
    contentHash: "hash-1",
  });
  assert.equal(compareJobs(original, sameHash).matchType, "content_hash");

  const exact = makeJob({ externalId: "job-4" });
  assert.equal(compareJobs(original, exact).matchType, "exact_content");

  const unique = makeJob({
    externalId: "job-5",
    rawTitle: "AI Product Manager",
  });
  const deduped = deduplicateJobs([original], [sameExternalId, sameUrl, sameHash, exact, unique]);
  assert.equal(deduped.uniqueJobs.length, 2);
  assert.equal(deduped.duplicates.length, 4);

  const firstSeen = "2026-09-21T09:00:00.000Z";
  const lifecycle = createJobLifecycle(firstSeen);
  assert.equal(lifecycle.status, "discovered");
  assert.equal(getLifecycleKey(original), "user-import:external:job-1");

  const active = touchJobLifecycle(lifecycle, "2026-09-21T10:00:00.000Z");
  assert.equal(active.status, "active");

  const stale = markJobStale(active, "2026-09-22T10:00:00.000Z");
  assert.equal(stale.status, "stale");

  const closed = closeJobLifecycle(stale, "2026-09-23T10:00:00.000Z");
  assert.equal(closed.status, "closed");

  const expired = expireJobLifecycle(closed, "2026-09-24T10:00:00.000Z");
  assert.equal(expired.status, "expired");
  assert.equal(expired.closedAt, "2026-09-23T10:00:00.000Z");

  console.log("V1.2.2 dedup + lifecycle acceptance passed.");
}

void main();
