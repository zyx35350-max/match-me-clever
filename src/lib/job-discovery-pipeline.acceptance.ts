import assert from "node:assert/strict";
import { createRawJob, USER_IMPORT_SOURCE } from "./job-source";
import { ingestDiscoveredJobs, type JobDiscoveryStore } from "./job-discovery-pipeline";

function makeJob(externalId: string, fetchedAt: string, title = "AI Visual Designer") {
  return createRawJob({
    source: USER_IMPORT_SOURCE,
    externalId,
    rawTitle: title,
    rawDescription: "Create product visuals and AI-assisted content.",
    companyName: "Example Studio",
    fetchedAt,
  });
}

async function main() {
  const first = makeJob("job-1", "2026-09-21T09:00:00.000Z");
  const store: JobDiscoveryStore = { records: [] };

  const firstResult = ingestDiscoveredJobs(store, [first]);
  assert.equal(firstResult.records.length, 1);
  assert.equal(firstResult.records[0].lifecycle.status, "discovered");

  const duplicate = makeJob("job-1", "2026-09-21T10:00:00.000Z");
  const secondResult = ingestDiscoveredJobs(firstResult, [duplicate]);
  assert.equal(secondResult.records.length, 1);
  assert.equal(secondResult.duplicates.length, 1);
  assert.equal(secondResult.records[0].lifecycle.status, "active");
  assert.equal(secondResult.records[0].raw.fetchedAt, duplicate.fetchedAt);

  const secondJob = makeJob("job-2", "2026-09-21T11:00:00.000Z", "AI Product Designer");
  const thirdResult = ingestDiscoveredJobs(secondResult, [secondJob]);
  assert.equal(thirdResult.records.length, 2);
  assert.equal(thirdResult.records[1].lifecycle.status, "discovered");

  console.log("V1.2.2 discovery pipeline acceptance passed.");
}

void main();
