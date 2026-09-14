import type { Job, MatchResult, Profile, ScoreBreakdown } from "./types";

const WEIGHTS = { skills: 0.5, salary: 0.2, location: 0.15, title: 0.15 };

const SENIORITY_ORDER = ["mid", "senior", "lead", "principal"] as const;

const norm = (s: string) => s.toLowerCase().trim();

function skillScore(profile: Profile, job: Job) {
  const jobSkills = job.skills.map(norm);
  const totalWeight = profile.skills.reduce((sum, s) => sum + s.weight, 0) || 1;
  let matchedWeight = 0;
  const matched: string[] = [];
  for (const skill of profile.skills) {
    if (jobSkills.includes(norm(skill.name))) {
      matchedWeight += skill.weight;
      matched.push(skill.name);
    }
  }
  const profileSkills = profile.skills.map((s) => norm(s.name));
  const missing = job.skills.filter((s) => !profileSkills.includes(norm(s)));
  matched.sort(
    (a, b) =>
      (profile.skills.find((s) => s.name === b)?.weight ?? 0) -
      (profile.skills.find((s) => s.name === a)?.weight ?? 0),
  );
  return { score: Math.round((matchedWeight / totalWeight) * 100), matched, missing };
}

function salaryScore(profile: Profile, job: Job) {
  if (!profile.minSalary) return 100;
  if (job.salaryMax >= profile.minSalary) {
    const headroom = (job.salaryMax - profile.minSalary) / profile.minSalary;
    return Math.min(100, Math.round(85 + headroom * 100));
  }
  return Math.max(0, Math.round((job.salaryMax / profile.minSalary) * 80));
}

function locationScore(profile: Profile, job: Job) {
  const pref = profile.workModePreference;
  if (pref === "any") return 95;
  if (pref === job.workMode) return 100;
  if (pref === "remote" && job.workMode === "hybrid") return 62;
  if (pref === "remote" && job.workMode === "onsite") return 30;
  if (pref === "hybrid" && job.workMode === "remote") return 80;
  if (pref === "hybrid" && job.workMode === "onsite") return 60;
  if (pref === "onsite" && job.workMode === "hybrid") return 78;
  return 45;
}

function titleScore(profile: Profile, job: Job) {
  const jobWords = new Set(norm(job.title).split(/[^a-z]+/).filter(Boolean));
  let best = 0;
  for (const target of profile.targetTitles) {
    const words = norm(target).split(/[^a-z]+/).filter(Boolean);
    if (!words.length) continue;
    const overlap = words.filter((w) => jobWords.has(w)).length / words.length;
    best = Math.max(best, overlap);
  }
  const levelGap = Math.abs(
    SENIORITY_ORDER.indexOf(job.seniority) - SENIORITY_ORDER.indexOf(profile.seniority),
  );
  const levelPenalty = levelGap * 12;
  return Math.max(0, Math.round(best * 100 - levelPenalty));
}

export function formatSalary(value: number) {
  return `$${Math.round(value / 1000)}k`;
}

export function scoreJob(profile: Profile, job: Job): MatchResult {
  const skills = skillScore(profile, job);
  const breakdown: ScoreBreakdown = {
    skills: skills.score,
    salary: salaryScore(profile, job),
    location: locationScore(profile, job),
    title: titleScore(profile, job),
  };

  const score = Math.round(
    breakdown.skills * WEIGHTS.skills +
      breakdown.salary * WEIGHTS.salary +
      breakdown.location * WEIGHTS.location +
      breakdown.title * WEIGHTS.title,
  );

  const reasons: string[] = [];
  const gaps: string[] = [];

  if (skills.matched.length) {
    reasons.push(
      `Overlaps on ${skills.matched.slice(0, 3).join(", ")} — ${
        skills.matched.length === 1 ? "the skill" : "skills"
      } you weighted highest.`,
    );
  } else {
    gaps.push("None of your weighted skills appear in this listing.");
  }

  if (job.salaryMax >= profile.minSalary) {
    const pct = Math.round(((job.salaryMax - profile.minSalary) / profile.minSalary) * 100);
    reasons.push(
      `Top of band is ${formatSalary(job.salaryMax)}, ${pct}% above your ${formatSalary(
        profile.minSalary,
      )} floor.`,
    );
  } else {
    const pct = Math.round(((profile.minSalary - job.salaryMax) / profile.minSalary) * 100);
    gaps.push(`Pays up to ${formatSalary(job.salaryMax)} — ${pct}% under your salary floor.`);
  }

  if (profile.workModePreference === "any" || job.workMode === profile.workModePreference) {
    reasons.push(`${labelMode(job.workMode)} setup matches your location preference.`);
  } else {
    gaps.push(
      `Role is ${labelMode(job.workMode).toLowerCase()} in ${job.location}; you prefer ${labelMode(
        profile.workModePreference,
      ).toLowerCase()}.`,
    );
  }

  if (breakdown.title >= 60) {
    reasons.push(`Title and level line up with your ${profile.seniority} target roles.`);
  } else if (job.seniority !== profile.seniority) {
    gaps.push(
      `Listed at ${job.seniority} level while you're targeting ${profile.seniority} roles.`,
    );
  }

  if (skills.missing.length) {
    gaps.push(`Not on your profile yet: ${skills.missing.slice(0, 3).join(", ")}.`);
  }

  const summary =
    score >= 85
      ? `Strong fit — skills, pay and setup all point the same way.`
      : score >= 70
        ? `Solid fit with a couple of trade-offs worth weighing.`
        : score >= 55
          ? `Partial fit — worth a look only if you're flexible on the gaps below.`
          : `Weak fit against your current profile.`;

  return {
    job,
    score,
    breakdown,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    reasons,
    gaps,
    summary,
  };
}

export function labelMode(mode: string) {
  if (mode === "remote") return "Remote";
  if (mode === "hybrid") return "Hybrid";
  if (mode === "onsite") return "On-site";
  return "Flexible";
}

export function rankJobs(profile: Profile, jobs: Job[]): MatchResult[] {
  return jobs.map((job) => scoreJob(profile, job)).sort((a, b) => b.score - a.score);
}

export function fitLabel(score: number) {
  if (score >= 85) return "High fit";
  if (score >= 70) return "Solid fit";
  if (score >= 55) return "Partial fit";
  return "Low fit";
}
