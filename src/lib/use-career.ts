import { useMemo, useState } from "react";

import {
  assessAllDirections,
  buildAICareerProfile,
  buildMatchContext,
  type MatchContext,
} from "./career-engine";
import { matchJobsWithUnderstanding } from "./job-understanding-matcher";
import { useWorkspace } from "./store";
import type { EmploymentType } from "./types";

/**
 * Shared derived career data: directions, AI profile hypothesis, job matches.
 * Every page reads matches from here, so a job scores the same everywhere.
 */
export function useCareer(track?: EmploymentType) {
  const { career, profile, jobs } = useWorkspace();
  const [refreshedAt, setRefreshedAt] = useState(0);

  const directions = useMemo(() => assessAllDirections(career), [career]);

  const ctx = useMemo<MatchContext>(() => buildMatchContext(career, profile), [career, profile]);

  const matches = useMemo(() => matchJobsWithUnderstanding(ctx, jobs, track), [ctx, jobs, track]);

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
    aiProfile,
    refreshAiProfile: () => setRefreshedAt(Date.now()),
  };
}
