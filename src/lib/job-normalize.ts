import { conceptKey, normalizeSkillConcepts, resolveConcept } from "./concepts";
import type { Job, NormalizedJob } from "./types";

/**
 * Adds canonical concept metadata underneath a listing without touching the
 * original wording. Original title, original description and language are
 * preserved exactly as the source provided them.
 */
export function normalizeJobConcepts(job: Job): NormalizedJob {
  const originalTitle = job.titleOriginal ?? job.title;
  const originalDescription = job.summaryOriginal ?? job.summary;

  const titleConcepts = [
    ...new Set(
      [job.title, job.titleOriginal]
        .filter((t): t is string => Boolean(t))
        .map((t) => resolveConcept(t))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  return {
    ...job,
    originalTitle,
    originalDescription,
    originalLanguage: job.language ?? "en",
    normalized: {
      canonicalSkills: normalizeSkillConcepts(job.skills),
      canonicalResponsibilities: [
        ...new Set(
          job.responsibilities
            .map((r) => resolveConcept(r))
            .filter((id): id is string => Boolean(id)),
        ),
      ],
      canonicalCareerDirections: job.careerDirection ? [job.careerDirection] : [],
      normalizedTitleConcepts: titleConcepts,
      normalizedIndustryConcepts: job.industry ? [conceptKey(job.industry)] : [],
    },
  };
}

export function normalizeJobs(jobs: Job[]): NormalizedJob[] {
  return jobs.map(normalizeJobConcepts);
}
