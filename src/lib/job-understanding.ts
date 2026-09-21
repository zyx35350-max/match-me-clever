import type { Job } from "./types";
import { detectJobLanguage } from "./job-language";
import { extractJobSemantics } from "./job-semantic-extraction";
import type { JobUnderstanding } from "./job-understanding-types";

/**
 * Build the non-destructive understanding layer for a raw job.
 *
 * Translation, company classification, and international-signal inference
 * remain separate future stages.
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
    semantic: extractJobSemantics(job),
  };
}
