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

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  seniority: Seniority;
  postedDaysAgo: number;
  summary: string;
  responsibilities: string[];
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
