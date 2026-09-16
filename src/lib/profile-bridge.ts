import { assessAllDirections } from "./career-engine";
import type { CareerProfile } from "./career-types";
import type { Profile, Seniority, WeightedSkill } from "./types";

/**
 * Compatibility layer. `CareerProfile` is the single authoritative profile.
 * A handful of surfaces (header identity, salary floor) still speak the older
 * flat `Profile` shape, so it is derived here rather than stored separately.
 */
export interface ProfileIdentity {
  name: string;
  headline: string;
  /** Annual salary floor used by the salary component of the match model. */
  minSalary: number;
}

export const defaultIdentity: ProfileIdentity = {
  name: "My profile",
  headline: "Cross-border e-commerce → exploring AI-adjacent work",
  minSalary: 80000,
};

const LEVEL_WEIGHT = { learning: 2, working: 3, proficient: 4, advanced: 5 } as const;

function seniorityFor(years: number): Seniority {
  if (years >= 10) return "principal";
  if (years >= 7) return "lead";
  if (years >= 4) return "senior";
  return "mid";
}

/** Derive the legacy flat profile from the authoritative career profile. */
export function deriveLegacyProfile(career: CareerProfile, identity: ProfileIdentity): Profile {
  const skills: WeightedSkill[] = career.skills.map((s) => ({
    name: s.name,
    weight: LEVEL_WEIGHT[s.level],
  }));

  const targetTitles = assessAllDirections(career)
    .slice(0, 3)
    .map((a) => a.direction.name);

  return {
    name: identity.name,
    headline: identity.headline,
    location: career.basics.preferredLocations[0] ?? "Remote",
    summary: `${career.basics.careerStage}. ${career.basics.yearsExperience} years of experience, currently exploring ${targetTitles.join(", ")}.`,
    targetTitles,
    skills,
    workModePreference: career.basics.workMode,
    minSalary: identity.minSalary,
    seniority: seniorityFor(career.basics.yearsExperience),
  };
}
