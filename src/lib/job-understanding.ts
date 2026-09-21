import type { Job } from "./types";
import { detectJobLanguage } from "./job-language";
import { extractJobSemantics } from "./job-semantic-extraction";
import { normalizeJobConcepts } from "./job-concept-normalization";
import type { JobUnderstanding } from "./job-understanding-types";

/**
 * Build the non-destructive understanding layer for a raw job.
 */
export function buildJobUnderstanding(job: Job): JobUnderstanding {
  const language = detectJobLanguage({
    title: job.titleOriginal ?? job.title,
    description: job.summaryOriginal ?? job.summary,
    responsibilities: job.responsibilities,
    skills: job.skills,
  });

  const semantic = extractJobSemantics(job);

  return {
    language,
    semantic,
    normalized: normalizeJobConcepts({
      ...(semantic.title ? { title: semantic.title } : {}),
      ...(job.industry ? { industry: job.industry } : {}),
      skills: semantic.skills,
      responsibilities: semantic.responsibilities,
      careerDirections: semantic.careerDirections,
    }),
  };
}
