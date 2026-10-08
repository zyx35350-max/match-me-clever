import assert from "node:assert/strict";
import { createFiftyOneJobSourceAdapter } from "./51job-source-adapter";
import { ingestAndAdaptJobs } from "./job-discovery-adapter";
import type { JobDiscoveryStore } from "./job-discovery-pipeline";

async function main() {
  const adapter = createFiftyOneJobSourceAdapter();

  const result = await adapter.discover({
    searches: [
      { keyword: "AI产品助理", jobArea: "040000", maxPages: 2 },
      { keyword: "AI产品运营", jobArea: "040000", maxPages: 1 },
      { keyword: "AI产品助理", jobArea: "020000", maxPages: 1 },
    ],
    maxPagesPerSearch: 2,
    delayMs: 1500,
    headless: true,
  });

  assert.notEqual(result.status, "failed", result.message);
  assert.ok(result.jobs.length >= 1, result.message);
  assert.ok(
    result.message.includes("AI产品助理/040000 page 2:"),
    `Pagination acceptance failed: Shenzhen AI产品助理 did not reach page 2.\n${result.message}`,
  );

  const sourceIds = new Set(result.jobs.map((job) => job.sourceId));
  assert.deepEqual([...sourceIds], ["51job"]);

  for (const job of result.jobs) {
    assert.ok(job.externalId, `missing externalId for ${job.rawTitle}`);
    assert.ok(job.sourceUrl, `missing sourceUrl for ${job.rawTitle}`);
    assert.match(job.sourceUrl!, /jobs\.51job\.com\/[^/]+\/\d{5,}\.html/i);
    assert.ok(job.rawTitle.trim().length > 0);
    assert.ok(job.rawDescription.trim().length > 0);
    assert.ok(job.companyName, `missing companyName for ${job.rawTitle}`);
    assert.ok(job.locationText, `missing locationText for ${job.rawTitle}`);
  }

  const uniqueExternalIds = new Set(result.jobs.map((job) => job.externalId));
  assert.equal(uniqueExternalIds.size, result.jobs.length);

  const shenzhenJobs = result.jobs.filter((job) => job.locationText?.includes("深圳"));
  const shanghaiJobs = result.jobs.filter((job) => job.locationText?.includes("上海"));
  assert.ok(shenzhenJobs.length > 0, `No Shenzhen jobs found.\n${result.message}`);
  assert.ok(shanghaiJobs.length > 0, `No Shanghai jobs found.\n${result.message}`);

  const store: JobDiscoveryStore = { records: [] };
  const adapted = ingestAndAdaptJobs(store, result.jobs);
  assert.equal(adapted.records.length, result.jobs.length);
  assert.equal(adapted.records.every((record) => record.raw.sourceId === "51job"), true);
  assert.equal(
    adapted.records.every((record) => record.lifecycle.status === "discovered"),
    true,
  );

  console.log("51Job Source Adapter V1 live acceptance passed.");
  console.log(
    JSON.stringify(
      {
        status: result.status,
        uniqueRawJobs: result.jobs.length,
        shenzhenJobs: shenzhenJobs.length,
        paginationVerified: result.message.includes("AI产品助理/040000 page 2:"),
        duplicatesRemoved: result.message.match(/(\d+) duplicate\(s\) removed/)?.[1] ?? "0",
        shanghaiJobs: shanghaiJobs.length,
        message: result.message,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
