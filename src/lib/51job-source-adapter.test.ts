import assert from "node:assert/strict";
import { createRawJob } from "./job-source";
import { deduplicateJobs } from "./job-dedup";
import {
  createFiftyOneJobSourceAdapter,
  FIFTYONEJOB_SOURCE,
  build51JobSearchUrl,
  parse51JobSalary,
} from "./51job-source-adapter";

async function main() {
  assert.equal(FIFTYONEJOB_SOURCE.id, "51job");
  assert.equal(FIFTYONEJOB_SOURCE.type, "job_board");
  assert.equal(FIFTYONEJOB_SOURCE.accessPolicy, "public_page");
  assert.equal(
    build51JobSearchUrl("AI产品助理", "040000"),
    "https://we.51job.com/pc/search?keyword=AI%E4%BA%A7%E5%93%81%E5%8A%A9%E7%90%86&jobArea=040000",
  );

  const salary = parse51JobSalary("1.2-1.5万·18薪");
  assert.equal(salary.min, 12000);
  assert.equal(salary.max, 15000);

  const first = createRawJob({
    source: FIFTYONEJOB_SOURCE,
    externalId: "173000308",
    sourceUrl: "https://jobs.51job.com/shanghai-mhq/173000308.html?s=one",
    rawTitle: "产品经理（AI代步机器人）",
    rawDescription: "AI产品经理岗位",
    companyName: "Example",
    locationText: "上海·松江区",
  });

  const sameJobFromAnotherSearch = createRawJob({
    source: FIFTYONEJOB_SOURCE,
    externalId: "173000308",
    sourceUrl: "https://jobs.51job.com/shanghai-mhq/173000308.html?s=two",
    rawTitle: "产品经理（AI代步机器人）",
    rawDescription: "AI产品经理岗位",
    companyName: "Example",
    locationText: "上海·松江区",
  });

  const another = createRawJob({
    source: FIFTYONEJOB_SOURCE,
    externalId: "173000309",
    sourceUrl: "https://jobs.51job.com/shanghai-mhq/173000309.html?s=one",
    rawTitle: "AI产品运营",
    rawDescription: "AI产品运营岗位",
  });

  const deduped = deduplicateJobs([], [first, sameJobFromAnotherSearch, another]);
  assert.equal(deduped.uniqueJobs.length, 2);
  assert.equal(deduped.duplicates.length, 1);
  assert.equal(deduped.duplicates[0]?.matchType, "external_id");

  const adapter = createFiftyOneJobSourceAdapter();
  assert.equal(adapter.source.id, "51job");

  console.log("51Job Source Adapter V1 structural acceptance passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
