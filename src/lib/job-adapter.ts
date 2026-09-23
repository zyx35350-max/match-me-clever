import type { Job, EmploymentType, Seniority, WorkMode } from "./types";
import type { RawJob } from "./job-source-types";
import type { JobLifecycle } from "./job-lifecycle";
import { buildJobUnderstanding } from "./job-understanding";
import { primaryCareerDirection } from "./job-role-direction-mapping";
import { extractJobEvidenceSignals } from "./job-evidence-signals";

export interface RawJobAdapterDefaults {
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  seniority?: Seniority;
  postedDaysAgo?: number;
}

export interface AdaptedJobRecord {
  raw: RawJob;
  job: Job;
  lifecycle?: JobLifecycle;
  understanding: ReturnType<typeof buildJobUnderstanding>;
  warnings: string[];
}

/**
 * V1.2.3 RawJob -> Job boundary.
 *
 * This adapter translates source records into the existing Job contract.
 * It does not invent salary, seniority, work mode, or other missing facts.
 * Missing required fields in the legacy Job shape use explicit technical
 * defaults and are reported in warnings until a source provides the data.
 */
export function adaptRawJobToJob(
  raw: RawJob,
  options: {
    lifecycle?: JobLifecycle;
    defaults?: RawJobAdapterDefaults;
  } = {},
): AdaptedJobRecord {
  const metadataSalaryMin = typeof raw.metadata?.salaryMin === "number" ? raw.metadata.salaryMin : undefined;
  const metadataSalaryMax = typeof raw.metadata?.salaryMax === "number" ? raw.metadata.salaryMax : undefined;
  const defaults = {
    ...options.defaults,
    ...(options.defaults?.salaryMin === undefined && metadataSalaryMin !== undefined ? { salaryMin: metadataSalaryMin } : {}),
    ...(options.defaults?.salaryMax === undefined && metadataSalaryMax !== undefined ? { salaryMax: metadataSalaryMax } : {}),
  };
  const warnings: string[] = [];

  const shell: Job = {
    id: raw.id,
    title: raw.rawTitle,
    company: raw.companyName ?? "Unknown company",
    location: raw.locationText ?? "Unknown location",
    workMode: defaults.workMode ?? "onsite",
    ...(defaults.employmentType ? { employmentType: defaults.employmentType } : {}),
    salaryMin: defaults.salaryMin ?? 0,
    salaryMax: defaults.salaryMax ?? 0,
    skills: [],
    seniority: defaults.seniority ?? "mid",
    postedDaysAgo: defaults.postedDaysAgo ?? 0,
    summary: raw.rawDescription,
    responsibilities: [],
    source: raw.sourceId,
    ...(raw.sourceUrl ? { sourceUrl: raw.sourceUrl } : {}),
  };

  if (!raw.companyName) warnings.push("companyName is missing");
  if (!raw.locationText) warnings.push("locationText is missing");
  if (defaults.workMode === undefined) warnings.push("workMode was not supplied");
  if (defaults.employmentType === undefined) warnings.push("employmentType was not supplied");
  if (defaults.salaryMin === undefined || defaults.salaryMax === undefined) {
    warnings.push("salary was not supplied");
  }
  if (defaults.seniority === undefined) warnings.push("seniority was not supplied");

  const understanding = buildJobUnderstanding(shell);
  const semantic = understanding.semantic;
  const evidenceSignals = extractJobEvidenceSignals(shell, semantic.jobRole, semantic.internationalSignals);

  const job: Job = {
    ...shell,
    ...(semantic.skills.length || evidenceSignals.skills.length
      ? { skills: [...new Set([...semantic.skills, ...evidenceSignals.skills])] }
      : {}),
    ...(semantic.responsibilities.length ? { responsibilities: semantic.responsibilities } : {}),
    ...(primaryCareerDirection(semantic.jobRole, semantic) ? { careerDirection: primaryCareerDirection(semantic.jobRole, semantic) } : {}),
    ...(semantic.jobRole !== "unknown" ? { jobRole: semantic.jobRole } : {}),
    ...(evidenceSignals.aiRelevance !== undefined ? { aiRelevance: evidenceSignals.aiRelevance } : {}),
    ...(evidenceSignals.growthPotential !== undefined ? { growthPotential: evidenceSignals.growthPotential } : {}),
    ...(evidenceSignals.negativeTags?.length ? { negativeTags: evidenceSignals.negativeTags } : {}),
    ...(semantic.workMode ? { workMode: semantic.workMode } : {}),
    ...(semantic.employmentType ? { employmentType: semantic.employmentType } : {}),
    ...(understanding.language !== "en"
      ? {
          titleOriginal: raw.rawTitle,
          summaryOriginal: raw.rawDescription,
        }
      : {}),
    ...(understanding.language === "en" || understanding.language === "zh"
      ? { language: understanding.language }
      : {}),
  };

  return {
    raw,
    job,
    ...(options.lifecycle ? { lifecycle: options.lifecycle } : {}),
    understanding,
    warnings,
  };
}
