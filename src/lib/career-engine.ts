import { careerDirections, getDirection, normalizeConcept } from "./career-data";
import type {
  AICareerProfile,
  CareerDirection,
  CareerProfile,
  DirectionAssessment,
  FeedbackAction,
  JobMatch,
  JobMatchBreakdown,
  NegativeSignal,
  ProfileClaim,
  ProfileSuggestion,
  ProvenSkill,
  UserFeedback,
} from "./career-types";
import type { EmploymentType, Job, NegativeTag, Profile } from "./types";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const LEVEL_STRENGTH: Record<ProvenSkill["level"], number> = {
  learning: 0.4,
  working: 0.62,
  proficient: 0.82,
  advanced: 1,
};

function strength(skill: ProvenSkill) {
  return LEVEL_STRENGTH[skill.level] * (0.7 + (skill.confidence / 5) * 0.3);
}

function findSkill(profile: CareerProfile, term: string) {
  const target = normalizeConcept(term);
  return profile.skills.find(
    (s) => normalizeConcept(s.name) === target || (s.nameOriginal && normalizeConcept(s.nameOriginal) === target),
  );
}

/** Average strength of a list of required concepts, 0-100. */
function coverage(profile: CareerProfile, terms: string[]) {
  if (!terms.length) return 0;
  const total = terms.reduce((sum, t) => {
    const skill = findSkill(profile, t);
    return sum + (skill ? strength(skill) : 0);
  }, 0);
  return clamp((total / terms.length) * 100);
}

// ---------------------------------------------------------------- directions

const DIRECTION_WEIGHTS = {
  currentExperience: 0.25,
  interest: 0.2,
  transferable: 0.15,
  aiRelevance: 0.15,
  growth: 0.1,
  learning: 0.1,
  market: 0.05,
};

export function assessDirection(profile: CareerProfile, direction: CareerDirection): DirectionAssessment {
  const { learning, priorities } = profile;
  const interestAvg =
    direction.interestKeys.reduce((sum, k) => sum + learning[k], 0) / (direction.interestKeys.length || 1);

  const breakdown = {
    currentExperience: direction.coreSkills.length ? coverage(profile, direction.coreSkills) : 35,
    interest: clamp(interestAvg * 20),
    transferable: coverage(profile, direction.transferableSkills),
    aiRelevance: clamp(direction.aiRelevance * 0.6 + direction.aiRelevance * (learning.ai / 5) * 0.4),
    growth: clamp(direction.growthPotential * 0.8 + priorities.growth * 4),
    learning: clamp(((learning.willingness + learning.uncertaintyTolerance) / 2) * 20),
    market: direction.marketOpportunity,
  };

  const score = clamp(
    Object.entries(DIRECTION_WEIGHTS).reduce(
      (sum, [key, weight]) => sum + breakdown[key as keyof typeof breakdown] * weight,
      0,
    ),
  );

  const matchedCore = direction.coreSkills.filter((s) => findSkill(profile, s));
  const missingCore = direction.coreSkills.filter((s) => !findSkill(profile, s));
  const matchedTransfer = direction.transferableSkills.filter((s) => findSkill(profile, s));

  const why: string[] = [direction.blurb];
  if (matchedCore.length) {
    why.push(`You already work in ${matchedCore.slice(0, 3).join(", ")}.`);
  } else {
    why.push("This sits outside your current day-to-day, so it reads as an exploration rather than a step across.");
  }
  if (breakdown.interest >= 80) why.push("Your stated interest in this area is high.");

  const evidence = profile.evidence
    .slice(0, 3)
    .map((e) => e.label)
    .concat(matchedCore.length ? [`Skills on file: ${matchedCore.slice(0, 4).join(", ")}`] : []);

  const advantages: string[] = [];
  if (breakdown.currentExperience >= 60) advantages.push("Direct experience means a shorter ramp.");
  if (matchedTransfer.length)
    advantages.push(`Transferable: ${matchedTransfer.slice(0, 3).join(", ")}.`);
  if (breakdown.learning >= 80) advantages.push("High learning willingness suits a direction still forming.");

  const gaps: string[] = [];
  if (missingCore.length) gaps.push(`Not yet on your profile: ${missingCore.slice(0, 3).join(", ")}.`);
  gaps.push("No formal project evidence in this direction yet — only adjacent work.");

  return {
    direction,
    score,
    breakdown,
    why,
    evidence,
    advantages,
    gaps,
    couldLearn: direction.learnable,
    nextStep: direction.nextStep,
  };
}

export function assessAllDirections(profile: CareerProfile): DirectionAssessment[] {
  return careerDirections.map((d) => assessDirection(profile, d)).sort((a, b) => b.score - a.score);
}

export function directionScoreMap(profile: CareerProfile): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of assessAllDirections(profile)) map[a.direction.id] = a.score;
  return map;
}

// -------------------------------------------------------- AI career profile

export function buildAICareerProfile(profile: CareerProfile): AICareerProfile {
  const ranked = assessAllDirections(profile);
  const top = ranked.slice(0, 3);
  const advanced = profile.skills.filter((s) => s.level === "advanced" || s.level === "proficient");
  const learningSkills = profile.skills.filter((s) => s.level === "learning" || s.level === "working");

  const fact = (text: string, because: string): ProfileClaim => ({ kind: "fact", text, because });
  const pref = (text: string, because: string): ProfileClaim => ({ kind: "preference", text, because });
  const inf = (text: string, because: string): ProfileClaim => ({ kind: "inference", text, because });

  return {
    identityHypothesis:
      "A candidate with cross-border e-commerce, overseas market research and product development experience who is exploring AI-related product, content, visual and e-commerce opportunities.",
    generatedAt: new Date().toISOString(),
    sections: [
      {
        key: "identity",
        title: "Career Identity",
        claims: [
          fact(
            `${profile.basics.yearsExperience} years of experience, currently ${profile.basics.careerStage.toLowerCase()}.`,
            "Taken directly from your basic profile.",
          ),
          inf(
            "Best read as a cross-functional e-commerce operator moving toward AI-assisted product and creative work, not a single fixed title.",
            "Your strongest skills span operations, research and creative tools at once, so no single job title covers them.",
          ),
        ],
      },
      {
        key: "strengths",
        title: "Core Strengths",
        claims: [
          fact(
            `Advanced or proficient in ${advanced.slice(0, 5).map((s) => s.name).join(", ")}.`,
            "Level and years recorded on each skill.",
          ),
          ...profile.evidence.slice(0, 3).map((e) => fact(e.label, e.detail)),
        ],
      },
      {
        key: "transferable",
        title: "Transferable Skills",
        claims: [
          inf(
            "Market research, competitor analysis and data monitoring transfer cleanly into product and analyst work.",
            "These are method skills, not platform skills — they do not depend on TEMU or any single channel.",
          ),
          inf(
            "Listing optimisation is applied conversion work, which reads as product and content sense to a hiring team.",
            "Inferred from the CTR and ranking evidence attached to your listing work.",
          ),
        ],
      },
      {
        key: "creative",
        title: "Creative Profile",
        claims: [
          pref(
            `Creativity is rated ${profile.workContent.creativity}/5 in your work-content preferences.`,
            "Your own rating.",
          ),
          fact(
            "Hands-on with AI image generation, Photoshop and short video editing.",
            "Recorded as working-level skills with evidence.",
          ),
          inf(
            "Visual and content work is likely to feel motivating rather than draining for you.",
            "High creativity and visual interest ratings alongside real production experience.",
          ),
        ],
      },
      {
        key: "ai",
        title: "AI Potential",
        claims: [
          pref(`AI interest rated ${profile.learning.ai}/5.`, "Your own rating."),
          fact("AI tools already used in production for listing imagery.", "Skill evidence on file."),
          inf(
            "Strong potential, thin proof: the tool use is real but there is no packaged AI project a hiring team can inspect.",
            "No portfolio or project evidence is recorded in the AI directions yet.",
          ),
        ],
      },
      {
        key: "learning",
        title: "Learning Profile",
        claims: [
          pref(
            `Learning willingness ${profile.learning.willingness}/5, tolerance for career uncertainty ${profile.learning.uncertaintyTolerance}/5.`,
            "Your own ratings.",
          ),
          pref(
            `Interested in: ${profile.learning.interestedSkills.slice(0, 5).join(", ")}.`,
            "From your learning and future potential section.",
          ),
          inf(
            "Current experience and future potential point in different directions — treat them separately when judging a role.",
            "Your proven skills are operational; your stated interests are creative and product-oriented.",
          ),
        ],
      },
      {
        key: "preferences",
        title: "Work Preferences",
        claims: [
          pref(
            `Prefers ${profile.basics.workMode} work; remote rated ${profile.workStyle.remote}/5, on-site ${profile.workStyle.onsite}/5.`,
            "Your own ratings.",
          ),
          pref(
            `Top priorities: growth ${profile.priorities.growth}/5, industry outlook ${profile.priorities.industryOutlook}/5, transferable skills ${profile.priorities.transferableSkills}/5 — above salary ${profile.priorities.salary}/5.`,
            "Career priorities you set.",
          ),
          pref(
            `Rules out: ${profile.dealBreakers.map((d) => d.label).join(", ")}.`,
            "Your deal breakers.",
          ),
        ],
      },
      {
        key: "risks",
        title: "Career Risks",
        claims: [
          inf(
            "Operations experience can pull you back into repetitive roles that pay adequately but stall growth.",
            "Your strongest proven skills are exactly what those roles hire for.",
          ),
          inf(
            "Exploring five directions at once risks shallow evidence in all of them.",
            "No direction currently has project evidence attached.",
          ),
        ],
      },
      {
        key: "gaps",
        title: "Skill Gaps",
        claims: [
          fact(
            `Still early-stage: ${learningSkills.map((s) => s.name).join(", ")}.`,
            "Marked as learning or working level on your profile.",
          ),
          inf(
            "Missing: formal product process (PRDs, discovery) and a packaged AI portfolio.",
            "No such skills or evidence items exist on the profile yet.",
          ),
        ],
      },
      {
        key: "directions",
        title: "Recommended Career Directions",
        claims: top.map((a) =>
          inf(
            `${a.direction.name} — hypothesis score ${a.score}. ${a.direction.blurb}`,
            `Weighted from current experience, interest, transferable skills, AI relevance, growth, learning and market signals.`,
          ),
        ),
      },
    ],
  };
}

// ------------------------------------------------------------- job matching

const NEGATIVES: Record<NegativeTag, { label: string; penalty: number }> = {
  pure_sales: { label: "Pure sales role", penalty: 30 },
  customer_service: { label: "Customer service duties", penalty: 30 },
  data_entry: { label: "Pure data entry", penalty: 30 },
  repetitive: { label: "Highly repetitive work", penalty: 20 },
  no_growth: { label: "No meaningful growth", penalty: 25 },
  unpaid_overtime: { label: "Heavy unpaid overtime", penalty: 20 },
};

const MATCH_WEIGHTS: Record<keyof JobMatchBreakdown, number> = {
  directionFit: 0.2,
  skillMatch: 0.2,
  relevantExperience: 0.15,
  growthPotential: 0.15,
  aiRelevance: 0.1,
  transferableSkills: 0.08,
  workPreference: 0.05,
  salary: 0.04,
  location: 0.03,
};

function detectNegatives(profile: CareerProfile, job: Job): NegativeSignal[] {
  const tags = new Set<NegativeTag>(job.negativeTags ?? []);
  if ((job.repetitiveWorkRisk ?? 0) >= 70) tags.add("repetitive");
  if ((job.overtimeRisk ?? 0) >= 70) tags.add("unpaid_overtime");
  if ((job.growthPotential ?? 50) <= 20) tags.add("no_growth");

  return [...tags].map((tag) => {
    const meta = NEGATIVES[tag];
    const breaker = profile.dealBreakers.find((d) => d.tag === tag);
    return {
      tag,
      label: meta.label,
      penalty: meta.penalty,
      isDealBreaker: breaker?.severity === "severe",
    };
  });
}

export interface MatchContext {
  career: CareerProfile;
  /** Legacy compatibility profile, derived from `career` (salary floor etc.). */
  profile: Profile;
  directionScores: Record<string, number>;
}

/** Build the match context from the authoritative career profile. */
export function buildMatchContext(career: CareerProfile, profile: Profile): MatchContext {
  return { career, profile, directionScores: directionScoreMap(career) };
}

/**
 * How suitable the job is for the user *today*: proven skills, relevant
 * experience, preferences and practicalities, minus deal-breaker friction.
 */
export function calculateImmediateFit(breakdown: JobMatchBreakdown, penalty: number) {
  return clamp(
    breakdown.skillMatch * 0.35 +
      breakdown.relevantExperience * 0.3 +
      breakdown.workPreference * 0.15 +
      breakdown.salary * 0.1 +
      breakdown.location * 0.1 -
      penalty * 0.4,
  );
}

interface GrowthInputs {
  breakdown: JobMatchBreakdown;
  penalty: number;
  track: EmploymentType;
  /** New ground the role would open up. */
  skillAcquisition: number;
  portfolio: number;
  industryOutlook: number;
  workEnvironment: number;
  stability: number;
  flexibility: number;
  lowCommitment: number;
  income: number;
}

/**
 * Long-term career value. Full-time uses the V1 career framework (career fit,
 * growth, industry outlook, skill acquisition, transferable skills, AI
 * relevance, salary, work environment, stability) with salary deliberately
 * small. Part-time uses the portfolio-weighted model.
 */
export function calculateCareerGrowthValue(i: GrowthInputs) {
  const { breakdown: b, penalty } = i;
  if (i.track === "parttime") {
    return clamp(
      i.skillAcquisition * 0.25 +
        i.portfolio * 0.2 +
        b.directionFit * 0.2 +
        b.aiRelevance * 0.15 +
        i.flexibility * 0.1 +
        i.income * 0.05 +
        i.lowCommitment * 0.05 -
        penalty * 0.6,
    );
  }
  return clamp(
    b.directionFit * 0.2 +
      b.growthPotential * 0.2 +
      i.industryOutlook * 0.1 +
      i.skillAcquisition * 0.15 +
      b.transferableSkills * 0.1 +
      b.aiRelevance * 0.1 +
      b.salary * 0.05 +
      i.workEnvironment * 0.05 +
      i.stability * 0.05 -
      penalty * 0.6,
  );
}

/** The single authoritative per-job scorer used by every page. */
export function matchJob(ctx: MatchContext, job: Job): JobMatch {
  const { career, profile, directionScores } = ctx;
  const track: EmploymentType = job.employmentType ?? "fulltime";
  const direction = getDirection(job.careerDirection);

  const matchedSkills = job.skills.filter((s) => findSkill(career, s));
  const missingSkills = job.skills.filter((s) => !findSkill(career, s));

  const skillMatch = coverage(career, job.skills);
  const matchedYears = matchedSkills.reduce((sum, s) => sum + (findSkill(career, s)?.years ?? 0), 0);
  const relevantExperience = clamp(
    (matchedSkills.length / (job.skills.length || 1)) * 60 +
      Math.min(40, (matchedYears / Math.max(1, matchedSkills.length)) * 12),
  );

  const workModeRating = career.workStyle[job.workMode];
  const contentBoost =
    (career.workContent.creativity + career.workContent.analysis + career.workContent.execution) / 3;
  const workPreference = clamp(workModeRating * 14 + contentBoost * 6);

  const salary =
    track === "parttime"
      ? clamp(45 + career.priorities.salary * 4)
      : job.salaryMax >= profile.minSalary
        ? clamp(85 + ((job.salaryMax - profile.minSalary) / Math.max(1, profile.minSalary)) * 100)
        : clamp((job.salaryMax / Math.max(1, profile.minSalary)) * 80);

  const prefersRemote = career.basics.workMode === "remote" || career.basics.workMode === "any";
  const locationHit =
    career.basics.preferredLocations.some((loc) =>
      job.location.toLowerCase().includes(loc.toLowerCase()),
    ) || (prefersRemote && job.workMode === "remote");
  const location = locationHit ? 95 : job.workMode === "remote" ? 80 : 50;

  const breakdown: JobMatchBreakdown = {
    directionFit: directionScores[job.careerDirection ?? "explore"] ?? 40,
    skillMatch,
    relevantExperience,
    growthPotential: job.growthPotential ?? 55,
    aiRelevance: job.aiRelevance ?? 30,
    transferableSkills: direction ? coverage(career, direction.transferableSkills) : 40,
    workPreference,
    salary,
    location,
  };

  const negatives = detectNegatives(career, job);
  const penalty = negatives.reduce((sum, n) => sum + n.penalty, 0);

  const raw = (Object.keys(MATCH_WEIGHTS) as Array<keyof JobMatchBreakdown>).reduce(
    (sum, key) => sum + breakdown[key] * MATCH_WEIGHTS[key],
    0,
  );
  const overall = clamp(raw - penalty);

  const immediateFit = calculateImmediateFit(breakdown, penalty);

  const portfolio = job.portfolioValue ?? 45;
  const skillAcquisition = clamp(
    (job.aiRelevance ?? 30) * 0.4 + (100 - breakdown.skillMatch) * 0.3 + (job.growthPotential ?? 55) * 0.3,
  );
  const flexibility = job.workMode === "remote" ? 90 : job.workMode === "hybrid" ? 70 : 40;
  const lowCommitment = 100 - Math.min(100, (job.overtimeRisk ?? 30) + 20);
  const income = track === "parttime" ? clamp((job.salaryMax / 9000) * 100) : breakdown.salary;
  // Proxies for signals the mock listings don't state outright.
  const industryOutlook = clamp((job.aiRelevance ?? 30) * 0.5 + (job.growthPotential ?? 55) * 0.5);
  const workEnvironment = clamp(
    (100 - (job.overtimeRisk ?? 30)) * 0.6 + breakdown.workPreference * 0.4,
  );
  const stability = clamp(
    (track === "parttime" ? 45 : 85) -
      (job.repetitiveWorkRisk ?? 30) * 0.2 -
      (negatives.length ? 10 : 0),
  );

  const careerGrowthValue = calculateCareerGrowthValue({
    breakdown,
    penalty,
    track,
    skillAcquisition,
    portfolio,
    industryOutlook,
    workEnvironment,
    stability,
    flexibility,
    lowCommitment,
    income,
  });

  const notRecommended = negatives.some((n) => n.isDealBreaker) || overall < 30;

  const explanation = explain({
    career,
    job,
    track,
    direction,
    matchedSkills,
    missingSkills,
    negatives,
    immediateFit,
    careerGrowthValue,
    notRecommended,
    portfolio,
  });

  return {
    job,
    track,
    overall,
    immediateFit,
    careerGrowthValue,
    breakdown,
    negatives,
    notRecommended,
    matchedSkills,
    missingSkills,
    direction,
    explanation,
  };
}

function explain(args: {
  career: CareerProfile;
  job: Job;
  track: EmploymentType;
  direction: CareerDirection | undefined;
  matchedSkills: string[];
  missingSkills: string[];
  negatives: NegativeSignal[];
  immediateFit: number;
  careerGrowthValue: number;
  notRecommended: boolean;
  portfolio: number;
}) {
  const {
    job,
    track,
    direction,
    matchedSkills,
    missingSkills,
    negatives,
    immediateFit,
    careerGrowthValue,
    notRecommended,
    portfolio,
  } = args;

  const fits: string[] = [];
  if (matchedSkills.length) {
    fits.push(
      `Your ${matchedSkills.slice(0, 3).join(", ")} experience maps onto what this role actually does day to day.`,
    );
  } else {
    fits.push("Nothing in your proven skills overlaps with this listing's requirements.");
  }
  if (direction) fits.push(`Sits in ${direction.name}, one of the directions you're testing.`);

  const bring = matchedSkills.length
    ? [
        `${matchedSkills.slice(0, 4).join(", ")} — with numbers behind them, not just exposure.`,
        "An operator's habit of watching data daily rather than at review time.",
      ]
    : ["Transferable research and data habits, but no direct skill overlap here."];

  const learn = [
    ...(direction ? direction.learnable.slice(0, 2) : []),
    ...(missingSkills.length ? [`On-the-job exposure to ${missingSkills.slice(0, 3).join(", ")}.`] : []),
  ];
  if (!learn.length) learn.push("Little new ground — this repeats what you can already do.");

  const concerns: string[] = negatives.map((n) =>
    n.isDealBreaker ? `${n.label} — one of your deal breakers.` : `${n.label} is a risk here.`,
  );
  if (missingSkills.length >= 3)
    concerns.push(`Asks for ${missingSkills.slice(0, 2).join(" and ")}, currently gaps on your profile.`);
  if (track === "parttime" && (job.salaryMax ?? 0) < 5000)
    concerns.push("Pay is low; it only makes sense for the evidence it creates.");
  if (!concerns.length) concerns.push("No significant red flags detected in the listing.");

  const careerValue =
    track === "parttime"
      ? `Portfolio value ${portfolio}/100. ${
          portfolio >= 75
            ? "Finishing this would give you a concrete artefact to show, which matters more than the fee."
            : "Limited portfolio payoff — the output is hard to show to anyone else."
        }`
      : `${
          careerGrowthValue >= 75
            ? "Real direction-building value: it adds evidence you currently lack."
            : careerGrowthValue >= 55
              ? "Moderate growth value — it extends your current lane rather than opening a new one."
              : "Low growth value; it mostly reuses what you already know."
        }`;

  const gap = careerGrowthValue - immediateFit;
  const tradeoff =
    Math.abs(gap) < 8
      ? "Immediate fit and growth value are close — no real tradeoff to weigh."
      : gap > 0
        ? `Harder to land now (${immediateFit}) than it is valuable later (${careerGrowthValue}). Worth stretching for if you can cover the gaps.`
        : `Easy for you today (${immediateFit}) but it adds less to where you're heading (${careerGrowthValue}). Comfortable, not developmental.`;

  const recommendation = notRecommended
    ? "Not recommended — kept visible so you can see why, not hidden."
    : careerGrowthValue >= 75 && immediateFit >= 60
      ? "Worth reviewing first."
      : careerGrowthValue >= 70
        ? "Worth reviewing, with the gaps in mind."
        : immediateFit >= 75
          ? "Reviewable, but treat it as a safe option rather than a step forward."
          : "Low priority for now.";

  return { fits, bring, learn, concerns, careerValue, recommendation, tradeoff };
}

export function matchJobs(ctx: MatchContext, jobs: Job[], track?: EmploymentType): JobMatch[] {
  return jobs
    .filter((j) => !track || (j.employmentType ?? "fulltime") === track)
    .map((j) => matchJob(ctx, j))
    .sort((a, b) => b.overall - a.overall);
}

// -------------------------------------------------------------- suggestions

const POSITIVE: FeedbackAction[] = ["saved", "applied", "interview", "accepted"];
const NEGATIVE: FeedbackAction[] = ["not_for_me", "dismissed"];

export function buildSuggestions(
  profile: CareerProfile,
  feedback: UserFeedback[],
  jobs: Job[],
): ProfileSuggestion[] {
  const tally: Record<string, number> = {};
  for (const f of feedback) {
    const dirId = f.directionId ?? jobs.find((j) => j.id === f.jobId)?.careerDirection;
    if (!dirId) continue;
    if (POSITIVE.includes(f.action)) tally[dirId] = (tally[dirId] ?? 0) + 1;
    if (NEGATIVE.includes(f.action)) tally[dirId] = (tally[dirId] ?? 0) - 1;
  }

  const suggestions: ProfileSuggestion[] = [];
  for (const [dirId, count] of Object.entries(tally)) {
    const direction = getDirection(dirId);
    if (!direction || count < 2) continue;
    const key = direction.interestKeys[0];
    if (!key || profile.learning[key] >= 5) continue;
    suggestions.push({
      id: `sug-${dirId}`,
      message: `Based on your recent choices, you seem increasingly interested in ${direction.name} roles. Would you like to update your career profile?`,
      because: `${count} positive signals on ${direction.name} listings (saved, applied or advanced) against no rejections.`,
      directionId: dirId,
      interestKey: key,
    });
  }
  return suggestions;
}

export function feedbackLabel(action: FeedbackAction) {
  return {
    viewed: "Viewed",
    saved: "Saved",
    applied: "Applied",
    not_for_me: "Not for me",
    dismissed: "Dismissed",
    interview: "Interview",
    rejected: "Rejected",
    accepted: "Accepted",
  }[action];
}

// -------------------------------------------------------------- public names
/** Canonical entry points. Pages must use these rather than local formulas. */
export const calculateJobMatch = matchJob;
export const calculateCareerDirectionScore = assessDirection;
