import assert from "node:assert/strict";
import { createRawJob, USER_IMPORT_SOURCE } from "./job-source";
import { ingestAndAdaptJobs } from "./job-discovery-adapter";
import type { JobDiscoveryStore } from "./job-discovery-pipeline";

function raw(externalId: string, fetchedAt: string) {
  return createRawJob({
    source: USER_IMPORT_SOURCE,
    externalId,
    rawTitle: "AI Visual Designer",
    rawDescription: "Create AI-assisted product visuals and collaborate with an international team.",
    companyName: "Example Studio",
    locationText: "Remote",
    fetchedAt,
  });
}

async function main() {
  const store: JobDiscoveryStore = { records: [] };
  const first = ingestAndAdaptJobs(store, [raw("job-1", "2026-09-21T14:00:00.000Z")], {
    workMode: "remote",
    employmentType: "fulltime",
    salaryMin: 10000,
    salaryMax: 16000,
    seniority: "mid",
  });

  assert.equal(first.records.length, 1);
  const firstRecord = first.records[0];
  assert.ok(firstRecord);
  assert.equal(firstRecord.job.id, firstRecord.raw.id);
  assert.equal(firstRecord.lifecycle.status, "discovered");
  assert.equal(firstRecord.job.title, "AI Visual Designer");
  assert.equal(firstRecord.job.source, USER_IMPORT_SOURCE.id);

  const secondStore: JobDiscoveryStore = { records: first.records };
  const refreshed = ingestAndAdaptJobs(
    secondStore,
    [raw("job-1", "2026-09-21T15:00:00.000Z")],
    { workMode: "remote", employmentType: "fulltime", salaryMin: 10000, salaryMax: 16000, seniority: "mid" },
  );

  assert.equal(refreshed.records.length, 1);
  assert.equal(refreshed.duplicates.length, 1);
  const refreshedRecord = refreshed.records[0];
  assert.ok(refreshedRecord);
  assert.equal(refreshedRecord.lifecycle.status, "active");
  assert.equal(refreshedRecord.raw.fetchedAt, "2026-09-21T15:00:00.000Z");

  console.log("V1.2.3 discovery adapter integration passed.");
}

void main();
