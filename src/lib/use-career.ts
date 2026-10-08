import { useMemo, useState } from "react";

import {
  assessAllDirections,
  buildAICareerProfile,
  buildMatchContext,
  type MatchContext,
} from "./career-engine";
import { matchJobsWithUnderstanding } from "./job-understanding-matcher";
import { effectiveJobLifecycle } from "./job-lifecycle";
import { useWorkspace } from "./store";
import type { EmploymentType } from "./types";

/**
 * Shared derived career data: directions, AI profile hypothesis, job matches.
 * Every page reads matches from here, so a job scores the same everywhere.
 */
export function useCareer(track?: EmploymentType) {
  const { career, profile, jobs, hiddenJobIds, importedJobRecords } = useWorkspace();
  const [refreshedAt, setRefreshedAt] = useState(0);

  const directions = useMemo(() => assessAllDirections(career), [career]);

  const ctx = useMemo<MatchContext>(() => buildMatchContext(career, profile), [career, profile]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const record = importedJobRecords.find((item) => item.raw.id === job.id);
        const status = effectiveJobLifecycle(record?.lifecycle, record?.raw);
        return status !== "closed" && status !== "expired" && !hiddenJobIds.includes(job.id);
      }),
    [jobs, importedJobRecords, hiddenJobIds],
  );

  const matches = useMemo(
    () => matchJobsWithUnderstanding(ctx, activeJobs, track),
    [ctx, activeJobs, track],
  );

  const hiddenJobs = useMemo(
    () => jobs.filter((job) => hiddenJobIds.includes(job.id)),
    [jobs, hiddenJobIds],
  );

  const aiProfile = useMemo(
    () => buildAICareerProfile(career),
    // refreshedAt lets the user regenerate the hypothesis on demand
    [career, refreshedAt],
  );

  return {
    career,
    directions,
    topDirection: directions[0],
    ctx,
    matches,
    hiddenJobs,
    aiProfile,
    refreshAiProfile: () => setRefreshedAt(Date.now()),
  };
}
