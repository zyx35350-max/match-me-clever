import type { Job } from "./types";
import { detectJobLanguage } from "./job-language";
import type { JobUnderstanding } from "./job-understanding-types";

/**
 * Build the non-destructive understanding shell for a raw job.
 *
 * This stage deliberately does not translate, infer facts, or classify the
 * company. It only detects the source language and creates safe placeholders
 * for later V1.1.5 stages.
 */
export function buildJobUnderstanding(job: Job): JobUnderstanding {
  const language = detectJobLanguage({
    title: job.titleOriginal ?? job.title,
    description: job.summaryOriginal ?? job.summary,
    responsibilities: job.responsibilities,
    skills: job.skills,
  });

  return {
    language,
    semantic: {
      skills: [],
      responsibilities: [],
      careerDirections: [],
      experienceRequirements: [],
      educationRequirements: [],
      languageRequirements: [],
      englishRequirement: "unknown",
      internationalSignals: {},
    },
  };
}
