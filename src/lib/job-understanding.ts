import type { Job } from "./types";
import { detectJobLanguage } from "./job-language";
import { extractJobSemantics } from "./job-semantic-extraction";
import { normalizeJobConcepts } from "./job-concept-normalization";
import { extractJobEvidenceSignals } from "./job-evidence-signals";
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
  const evidence = extractJobEvidenceSignals(job, semantic.jobRole, semantic.internationalSignals);
  const enrichedSkills = [...new Set([...semantic.skills, ...evidence.skills])];

  return {
    language,
    semantic,
    normalized: normalizeJobConcepts({
      ...(semantic.title ? { title: semantic.title } : {}),
      ...(job.industry ? { industry: job.industry } : {}),
      skills: enrichedSkills,
      responsibilities: semantic.responsibilities,
      careerDirections: semantic.careerDirections,
    }),
  };
}
