import assert from "node:assert/strict";
import { createRawJob, USER_IMPORT_SOURCE } from "./job-source";
import { createJobLifecycle } from "./job-lifecycle";
import { adaptRawJobToJob } from "./job-adapter";

async function main() {
  const raw = createRawJob({
    source: USER_IMPORT_SOURCE,
    externalId: "job-123",
    sourceUrl: "https://example.com/jobs/123?utm_source=test",
    rawTitle: "AI Visual Designer",
    rawDescription:
      "Create AI-assisted product visuals and collaborate with an international team.",
    companyName: "Example Studio",
    locationText: "Remote",
    fetchedAt: "2026-09-21T12:00:00.000Z",
  });

  const lifecycle = createJobLifecycle(raw.fetchedAt);
  const adapted = adaptRawJobToJob(raw, {
    lifecycle,
    defaults: {
      workMode: "remote",
      employmentType: "fulltime",
      salaryMin: 12000,
      salaryMax: 18000,
      seniority: "mid",
    },
  });

  assert.equal(adapted.raw, raw);
  assert.equal(adapted.lifecycle, lifecycle);
  assert.equal(adapted.job.id, raw.id);
  assert.equal(adapted.job.title, raw.rawTitle);
  assert.equal(adapted.job.company, raw.companyName);
  assert.equal(adapted.job.location, raw.locationText);
  assert.equal(adapted.job.source, raw.sourceId);
  assert.equal(adapted.job.sourceUrl, raw.sourceUrl);
  assert.equal(adapted.job.workMode, "remote");
  assert.equal(adapted.job.salaryMin, 12000);
  assert.equal(adapted.job.salaryMax, 18000);
  assert.equal(adapted.understanding.semantic.careerDirections.length > 0, true);
  assert.equal(adapted.understanding.semantic.internationalSignals.globalTeam, true);
  assert.equal(adapted.warnings.length, 0);

  const incomplete = adaptRawJobToJob(
    createRawJob({
      source: USER_IMPORT_SOURCE,
      rawTitle: "Product Designer",
      rawDescription: "Design product experiences.",
      fetchedAt: "2026-09-21T13:00:00.000Z",
    }),
  );

  assert.equal(incomplete.job.company, "Unknown company");
  assert.equal(incomplete.job.location, "Unknown location");
  assert.equal(incomplete.warnings.includes("salary was not supplied"), true);
  assert.equal(incomplete.warnings.includes("workMode was not supplied"), true);

  console.log("V1.2.3 RawJob adapter acceptance passed.");
}

void main();
