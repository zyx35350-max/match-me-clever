import assert from "node:assert/strict";
import {
  USER_IMPORT_SOURCE,
  UnimplementedJobSourceAdapter,
  buildRawJobId,
  createRawJob,
  defaultJobSources,
  sourceCanDiscover,
} from "./job-source";

async function main() {
  assert.equal(USER_IMPORT_SOURCE.type, "user_import");
  assert.equal(USER_IMPORT_SOURCE.accessPolicy, "manual_import");
  assert.equal(sourceCanDiscover(USER_IMPORT_SOURCE), true);

  const raw = createRawJob({
    source: USER_IMPORT_SOURCE,
    externalId: "job-123",
    rawTitle: "AI Visual Content Designer",
    rawDescription: "Create product visuals and short-form content.",
    companyName: "Example Studio",
  });

  assert.equal(raw.sourceId, "user-import");
  assert.equal(raw.externalId, "job-123");
  assert.equal(raw.rawTitle, "AI Visual Content Designer");
  assert.equal(raw.companyName, "Example Studio");
  assert.ok(raw.id.startsWith("raw-"));

  const sameId = buildRawJobId(
    USER_IMPORT_SOURCE.id,
    "job-123",
    "AI Visual Content Designer",
    "Create product visuals and short-form content.",
  );
  assert.equal(raw.id, sameId);

  const unavailable = defaultJobSources.find((source) => source.id === "job-board");
  assert.ok(unavailable);
  assert.equal(unavailable.enabled, false);
  assert.equal(sourceCanDiscover(unavailable), false);

  const adapter = new UnimplementedJobSourceAdapter(unavailable);
  const result = await adapter.discover();
  assert.equal(result.status, "failed");
  assert.equal(result.jobs.length, 0);

  console.log("V1.2 job source foundation acceptance passed.");
}

void main();
