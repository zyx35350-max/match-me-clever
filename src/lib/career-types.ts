import type { EmploymentType, Job, NegativeTag, WorkMode } from "./types";

/** 1-5 rating used across preferences and confidence. */
export type Rating = 1 | 2 | 3 | 4 | 5;

export type SkillLevel = "learning" | "working" | "proficient" | "advanced";

export interface ProvenSkill {
  id: string;
  name: string;
  /** Original-language label, when the skill is usually named in Chinese. */
  nameOriginal?: string;
  level: SkillLevel;
  evidence: string;
  years: number;
  confidence: Rating;
}

export interface EvidenceItem {
  id: string;
  label: string;
  detail: string;
}

export interface DealBreaker {
  id: string;
  label: string;
  tag: NegativeTag;
  severity: "severe" | "moderate";
}

export interface BasicProfile {
  education: string;
  yearsExperience: number;
  careerStage: string;
  preferredLocations: string[];
  relocation: string;
  workMode: WorkMode | "any";
  languages: string[];
}

export interface WorkContentPreference {
  creativity: Rating;
  communication: Rating;
  analysis: Rating;
  execution: Rating;
}

export interface CareerPriorities {
  growth: Rating;
  industryOutlook: Rating;
  transferableSkills: Rating;
  salary: Rating;
  workingHours: Rating;
  stability: Rating;
}

export interface WorkStylePreference {
  remote: Rating;
  hybrid: Rating;
  onsite: Rating;
}

export interface OtherPreference {
  id: string;
  label: string;
  enabled: boolean;
}

export interface LearningProfile {
  willingness: Rating;
  interestedSkills: string[];
  ai: Rating;
  programming: Rating;
  automation: Rating;
  product: Rating;
  content: Rating;
  visual: Rating;
  uncertaintyTolerance: Rating;
}

export interface CareerProfile {
  basics: BasicProfile;
  skills: ProvenSkill[];
  evidence: EvidenceItem[];
  workContent: WorkContentPreference;
  priorities: CareerPriorities;
  workStyle: WorkStylePreference;
  otherPreferences: OtherPreference[];
  dealBreakers: DealBreaker[];
  learning: LearningProfile;
}

/** Static definition of an explorable career direction. */
export interface CareerDirection {
  id: string;
  name: string;
  nameOriginal?: string;
  blurb: string;
  coreSkills: string[];
  transferableSkills: string[];
  learnable: string[];
  aiRelevance: number;
  growthPotential: number;
  marketOpportunity: number;
  interestKeys: Array<keyof Pick<LearningProfile, "ai" | "programming" | "automation" | "product" | "content" | "visual">>;
  nextStep: string;
}

export interface DirectionBreakdown {
  currentExperience: number;
  interest: number;
  transferable: number;
  aiRelevance: number;
  growth: number;
  learning: number;
  market: number;
}

export interface DirectionAssessment {
  direction: CareerDirection;
  score: number;
  breakdown: DirectionBreakdown;
  why: string[];
  evidence: string[];
  advantages: string[];
  gaps: string[];
  couldLearn: string[];
  nextStep: string;
}

export type ClaimKind = "fact" | "preference" | "inference";

export interface ProfileClaim {
  kind: ClaimKind;
  text: string;
  /** How the assistant got here. */
  because: string;
}

export interface AICareerProfile {
  identityHypothesis: string;
  generatedAt: string;
  sections: Array<{ key: string; title: string; claims: ProfileClaim[] }>;
}

export interface JobMatchBreakdown {
  directionFit: number;
  skillMatch: number;
  relevantExperience: number;
  growthPotential: number;
  aiRelevance: number;
  transferableSkills: number;
  workPreference: number;
  salary: number;
  location: number;
}

export interface NegativeSignal {
  tag: NegativeTag;
  label: string;
  penalty: number;
  isDealBreaker: boolean;
}

export interface JobExplanation {
  fits: string[];
  bring: string[];
  learn: string[];
  concerns: string[];
  careerValue: string;
  recommendation: string;
  tradeoff: string;
}

export interface JobMatch {
  job: Job;
  track: EmploymentType;
  overall: number;
  immediateFit: number;
  careerGrowthValue: number;
  breakdown: JobMatchBreakdown;
  negatives: NegativeSignal[];
  notRecommended: boolean;
  matchedSkills: string[];
  missingSkills: string[];
  direction?: CareerDirection;
  explanation: JobExplanation;
}

export type FeedbackAction =
  | "viewed"
  | "saved"
  | "applied"
  | "not_for_me"
  | "dismissed"
  | "interview"
  | "rejected"
  | "accepted";

export interface UserFeedback {
  id: string;
  jobId: string;
  jobTitle: string;
  action: FeedbackAction;
  directionId?: string;
  at: string;
}

export interface ProfileSuggestion {
  id: string;
  message: string;
  because: string;
  /** Direction to raise interest in, when the suggestion is accepted. */
  directionId?: string;
  interestKey?: keyof LearningProfile;
}
