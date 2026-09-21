/**
 * Job Understanding data-model foundation (V1.1.5).
 *
 * These types describe what we can learn about a job listing beyond its raw
 * text: detected language, optional translations, semantic extraction, company
 * classification, and international signals.
 *
 * Constraints enforced by design:
 * - Original job title and description are never overwritten; translations are
 *   optional additive fields.
 * - Any English or international information we cannot determine is represented
 *   as "unknown", never as a silent default.
 * - A global team does not automatically imply a multinational company — the
 *   two are independent signals.
 */

export type JobLanguage = "zh" | "en" | "mixed" | "unknown";

export type EnglishRequirement = "required" | "preferred" | "unknown";

export type EvidenceLevel = "explicit" | "strong" | "inferred" | "unknown";

export type CompanyType =
  | "foreign_owned"
  | "multinational"
  | "international_company"
  | "domestic_private"
  | "state_owned"
  | "public_company"
  | "startup"
  | "unknown";

export interface InternationalSignals {
  overseasBusiness?: boolean;
  globalTeam?: boolean;
  englishUsage?: boolean;
  crossBorderCollaboration?: boolean;
}

export interface JobSemanticExtraction {
  title?: string;
  skills: string[];
  responsibilities: string[];
  careerDirections: string[];
  experienceRequirements?: string[];
  educationRequirements?: string[];
  workMode?: string;
  employmentType?: string;
  languageRequirements?: string[];
  englishRequirement: EnglishRequirement;
  internationalSignals: InternationalSignals;
}

export interface CompanyClassification {
  value: CompanyType;
  confidence?: number;
  evidence: EvidenceLevel;
}

export interface JobUnderstanding {
  language: JobLanguage;
  titleTranslated?: string;
  descriptionTranslated?: string;
  semantic: JobSemanticExtraction;
  companyType?: CompanyClassification;
}
