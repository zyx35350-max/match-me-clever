export type WorkMode = "remote" | "hybrid" | "onsite";

export type Seniority = "mid" | "senior" | "lead" | "principal";

export interface WeightedSkill {
  name: string;
  weight: number; // 1-5
}

export interface Profile {
  name: string;
  headline: string;
  location: string;
  summary: string;
  targetTitles: string[];
  skills: WeightedSkill[];
  workModePreference: WorkMode | "any";
  minSalary: number;
  seniority: Seniority;
}

export type EmploymentType = "fulltime" | "parttime";

/** Tags that trigger negative matching signals. */
export type NegativeTag =
  | "pure_sales"
  | "customer_service"
  | "data_entry"
  | "repetitive"
  | "no_growth"
  | "unpaid_overtime";

export interface Job {
  id: string;
  title: string;
  /** Original-language title when the listing is not in English. */
  titleOriginal?: string;
  company: string;
  location: string;
  workMode: WorkMode;
  employmentType?: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  /** Free-form pay note for part-time / project work. */
  salaryNote?: string;
  skills: string[];
  seniority: Seniority;
  postedDaysAgo: number;
  summary: string;
  /** Original-language description when the listing is not in English. */
  summaryOriginal?: string;
  responsibilities: string[];
  industry?: string;
  /** Career direction id this listing belongs to. */
  careerDirection?: string;
  aiRelevance?: number;
  growthPotential?: number;
  portfolioValue?: number;
  repetitiveWorkRisk?: number;
  overtimeRisk?: number;
  negativeTags?: NegativeTag[];
  source?: string;
  sourceUrl?: string;
  language?: "en" | "zh";
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "in_review"
  | "interview"
  | "offer"
  | "rejected";

export interface ActivityEntry {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  kind: "saved" | "unsaved" | "applied" | "status" | "profile";
  label: string;
  at: string; // ISO
}

export interface Application {
  jobId: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string;
}

export interface ScoreBreakdown {
  skills: number;
  salary: number;
  location: number;
  title: number;
}

export interface MatchResult {
  job: Job;
  score: number;
  breakdown: ScoreBreakdown;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  gaps: string[];
  summary: string;
}
