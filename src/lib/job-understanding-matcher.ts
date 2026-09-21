import type { JobMatch } from "./career-types";
import type { Job } from "./types";
import type { JobUnderstanding } from "./job-understanding-types";
import { matchJob, type MatchContext } from "./career-engine";
import { buildJobUnderstanding } from "./job-understanding";

/**
 * Match an understood job without changing the existing scoring formula.
 *
 * The Career Engine remains the single scorer. This adapter only supplies
 * canonical skill/career-direction concepts to it, then restores the original
 * Job object on the returned match so UI/source data stays untouched.
 */
export function matchUnderstoodJob(
  ctx: MatchContext,
  job: Job,
  understanding: JobUnderstanding,
): JobMatch {
  const canonicalSkills = understanding.normalized?.canonicalSkills;
  const canonicalDirections = understanding.normalized?.canonicalCareerDirections ?? [];

  const matchableJob: Job = {
    ...job,
    skills: canonicalSkills?.length ? canonicalSkills : job.skills,
    ...(job.careerDirection
      ? { careerDirection: job.careerDirection }
      : canonicalDirections.length === 1
        ? { careerDirection: canonicalDirections[0] }
        : {}),
  };

  const result = matchJob(ctx, matchableJob);
  return {
    ...result,
    job,
  };
}

/** Convenience wrapper: build the understanding layer before matching. */
export function matchRawJobWithUnderstanding(ctx: MatchContext, job: Job): JobMatch {
  return matchUnderstoodJob(ctx, job, buildJobUnderstanding(job));
}

/** Match a collection through Job Understanding before the single Career Engine scorer. */
export function matchJobsWithUnderstanding(
  ctx: MatchContext,
  jobs: Job[],
  track?: JobMatch["track"],
): JobMatch[] {
  return jobs
    .filter((job) => !track || (job.employmentType ?? "fulltime") === track)
    .map((job) => matchRawJobWithUnderstanding(ctx, job))
    .sort((a, b) => b.overall - a.overall);
}
