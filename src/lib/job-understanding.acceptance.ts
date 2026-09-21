import assert from "node:assert/strict";
import { buildJobUnderstanding } from "./job-understanding";
import { matchRawJobWithUnderstanding } from "./job-understanding-matcher";
import type { Job } from "./types";
import type { CareerProfile } from "./career-types";
import { buildMatchContext } from "./career-engine";
import type { Profile } from "./types";

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: "acceptance-1",
    title: "AI Visual Content Specialist",
    company: "Example Studio",
    location: "Remote",
    workMode: "remote",
    salaryMin: 8000,
    salaryMax: 12000,
    skills: ["AI Image Generation", "Photoshop"],
    seniority: "mid",
    postedDaysAgo: 1,
    summary: "Create product visuals for a global team. English communication is required.",
    responsibilities: ["Create product visuals", "Collaborate with global teams"],
    ...overrides,
  };
}

function makeCareer(): CareerProfile {
  return {
    basics: {
      education: "college",
      yearsExperience: 2,
      careerStage: "early-career",
      preferredLocations: ["Remote"],
      relocation: "open",
      workMode: "remote",
      languages: ["Chinese", "English"],
    },
    skills: [
      { id: "ai-image", name: "AI Product Image Generation", level: "working", evidence: "portfolio practice", years: 1, confidence: 4 },
      { id: "photoshop", name: "Photoshop", level: "working", evidence: "work experience", years: 1, confidence: 4 },
    ],
    evidence: [],
    workContent: { creativity: 5, communication: 3, analysis: 4, execution: 4 },
    priorities: { growth: 5, industryOutlook: 5, transferableSkills: 5, salary: 3, workingHours: 4, stability: 3 },
    workStyle: { remote: 5, hybrid: 4, onsite: 2 },
    otherPreferences: [],
    dealBreakers: [],
    learning: {
      willingness: 5,
      interestedSkills: ["AI visual"],
      ai: 5,
      programming: 2,
      automation: 3,
      product: 3,
      content: 4,
      visual: 5,
      uncertaintyTolerance: 4,
    },
  };
}

function makeProfile(): Profile {
  return {
    name: "Test",
    headline: "AI visual",
    location: "Remote",
    summary: "Test profile",
    targetTitles: ["AI Visual Content Specialist"],
    skills: [
      { name: "AI Product Image Generation", weight: 5 },
      { name: "Photoshop", weight: 4 },
    ],
    workModePreference: "remote",
    minSalary: 7000,
    seniority: "mid",
  };
}

function testUnderstanding() {
  const zh = makeJob({
    id: "zh",
    title: "AI视觉设计师",
    titleOriginal: "AI视觉设计师",
    summary: "负责产品视觉与内容创作。",
    summaryOriginal: "负责产品视觉与内容创作。",
    responsibilities: ["设计产品图片"],
    skills: ["AI出图", "PS"],
  });
  const zhResult = buildJobUnderstanding(zh);
  assert.equal(zhResult.language, "zh");
  assert.equal(zhResult.semantic.englishRequirement, "unknown");
  assert.equal(zhResult.semantic.internationalSignals.globalTeam, undefined);

  const en = makeJob({
    id: "en",
    title: "AI Visual Designer",
    summary: "Create product visuals and collaborate with an international team.",
    responsibilities: ["Create product visuals"],
    skills: ["AI Image Generation", "Photoshop"],
  });
  assert.equal(buildJobUnderstanding(en).language, "en");

  const mixed = makeJob({
    id: "mixed",
    title: "AI视觉 Designer",
    summary: "负责 product visuals。",
  });
  assert.equal(buildJobUnderstanding(mixed).language, "mixed");

  const required = buildJobUnderstanding(makeJob({
    summary: "English communication is required for meetings and email.",
  }));
  assert.equal(required.semantic.englishRequirement, "required");
  assert.equal(required.semantic.internationalSignals.englishUsage, true);

  const preferred = buildJobUnderstanding(makeJob({
    summary: "English is preferred; experience with global teams is a plus.",
  }));
  assert.equal(preferred.semantic.englishRequirement, "preferred");
  assert.equal(preferred.semantic.internationalSignals.globalTeam, true);

  const genericEnglish = buildJobUnderstanding(makeJob({
    summary: "Read English materials when needed.",
  }));
  assert.equal(genericEnglish.semantic.englishRequirement, "unknown");

  const globalOnly = buildJobUnderstanding(makeJob({
    summary: "Work with a global team on product visuals.",
    responsibilities: ["Create visuals"],
  }));
  assert.equal(globalOnly.semantic.internationalSignals.globalTeam, true);
  assert.equal(globalOnly.semantic.internationalSignals.overseasBusiness, undefined);
  assert.equal(globalOnly.companyType, undefined);

  const overseas = buildJobUnderstanding(makeJob({
    summary: "Manage overseas markets and cross-border collaboration.",
  }));
  assert.equal(overseas.semantic.internationalSignals.overseasBusiness, true);
  assert.equal(overseas.semantic.internationalSignals.crossBorderCollaboration, true);

  const original = makeJob();
  const before = JSON.stringify(original);
  const understood = buildJobUnderstanding(original);
  assert.equal(JSON.stringify(original), before);
  assert.equal(understood.semantic.title, original.title);
  assert.equal(understood.titleTranslated, undefined);
  assert.equal(understood.descriptionTranslated, undefined);
  assert.ok(understood.normalized);
}

function testMatcherAdapter() {
  const career = makeCareer();
  const ctx = buildMatchContext(career, makeProfile());
  const job = makeJob({ id: "matcher", careerDirection: "ai-visual" });
  const result = matchRawJobWithUnderstanding(ctx, job);
  assert.equal(result.job, job);
  assert.equal(result.job.id, "matcher");
  assert.ok(Number.isFinite(result.overall));
  assert.ok(Number.isFinite(result.immediateFit));
  assert.ok(Number.isFinite(result.careerGrowthValue));
}

testUnderstanding();
testMatcherAdapter();
console.log("V1.1.5 acceptance tests passed.");
