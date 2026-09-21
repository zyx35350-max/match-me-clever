import type { JobNormalization } from "./types";
import { conceptKey, normalizeSkillConcepts, resolveConcept } from "./concepts";

/**
 * Convert extracted source wording into canonical concepts used by matching.
 * Original wording is never changed; this is an additive representation.
 */
export function normalizeJobConcepts(input: {
  title?: string;
  industry?: string;
  skills: string[];
  responsibilities: string[];
  careerDirections: string[];
}): JobNormalization {
  const normalizeList = (terms: string[]) => [...new Set(terms.map((term) => conceptKey(term)).filter(Boolean))];

  return {
    canonicalSkills: normalizeSkillConcepts(input.skills),
    canonicalResponsibilities: normalizeList(input.responsibilities),
    canonicalCareerDirections: normalizeList(input.careerDirections),
    normalizedTitleConcepts: input.title ? normalizeList([input.title]) : [],
    normalizedIndustryConcepts: input.industry ? normalizeList([input.industry]) : [],
  };
}

/** Whether a source term maps to a known taxonomy concept. */
export function isKnownJobConcept(term: string): boolean {
  return Boolean(resolveConcept(term));
}
