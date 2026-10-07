import { adaptRawJobToJob } from "./job-adapter";
import { understandJobWithGemini, type AIJobUnderstanding } from "./ai-job-understanding";
import { parseUserJobText, type UserJobImportInput, type UserJobImportResult } from "./user-job-import";

export interface AIJobPipelineResult extends UserJobImportResult {
  aiUnderstanding?: AIJobUnderstanding;
  analysisSource: "gemini" | "deterministic";
  analysisWarning?: string;
}

function mapSeniority(value: AIJobUnderstanding["seniority"]) {
  switch (value) {
    case "senior":
      return "senior" as const;
    case "lead":
      return "lead" as const;
    case "director":
      return "principal" as const;
    case "mid":
    case "junior":
      return "mid" as const;
    default:
      return undefined;
  }
}

function applyAIToRaw(base: UserJobImportResult, ai: AIJobUnderstanding) {
  const salaryMin = ai.salary.min ?? base.job.salaryMin;
  const salaryMax = ai.salary.max ?? base.job.salaryMax;
  const raw = {
    ...base.raw,
    rawTitle: ai.title.value?.trim() || base.raw.rawTitle,
    ...(ai.company.value?.trim() ? { companyName: ai.company.value.trim() } : {}),
    ...(ai.location.value?.trim() ? { locationText: ai.location.value.trim() } : {}),
    metadata: {
      ...(base.raw.metadata ?? {}),
      ...(ai.salary.min !== null ? { salaryMin } : {}),
      ...(ai.salary.max !== null ? { salaryMax } : {}),
      aiUnderstanding: ai,
    } as unknown as NonNullable<typeof base.raw.metadata>,
  };

  const adapted = adaptRawJobToJob(raw, {
    defaults: {
      salaryMin,
      salaryMax,
      ...(mapSeniority(ai.seniority) ? { seniority: mapSeniority(ai.seniority) } : {}),
      ...(ai.workMode !== "unknown" ? { workMode: ai.workMode } : {}),
      ...(ai.employmentType !== "unknown" ? { employmentType: ai.employmentType } : {}),
    },
  });

  const job = {
    ...adapted.job,
    ...(ai.title.value ? { title: ai.title.value } : {}),
    ...(ai.company.value ? { company: ai.company.value } : {}),
    ...(ai.location.value ? { location: ai.location.value } : {}),
    ...(ai.salary.evidence ? { salaryNote: ai.salary.evidence } : {}),
    ...(ai.requiredSkills.length ? { skills: ai.requiredSkills.map((item) => item.name) } : {}),
    ...(ai.responsibilities.length
      ? { responsibilities: ai.responsibilities.map((item) => item.text) }
      : {}),
    ...(ai.jobRole !== "unknown" ? { jobRole: ai.jobRole } : {}),
    ...(ai.careerDirections.length ? { careerDirection: ai.careerDirections[0] } : {}),
    ...(ai.aiRelevance === "explicit"
      ? { aiRelevance: 100 }
      : ai.aiRelevance === "adjacent"
        ? { aiRelevance: 60 }
        : ai.aiRelevance === "none"
          ? { aiRelevance: 0 }
          : {}),
  };

  return {
    ...base,
    raw,
    job,
    understanding: {
      ...adapted.understanding,
      semantic: {
        ...adapted.understanding.semantic,
        experienceRequirements:
          ai.experience.relation === "unknown"
            ? adapted.understanding.semantic.experienceRequirements
            : [ai.experience.evidence ?? "AI-extracted experience requirement"],
        educationRequirements:
          ai.education.requirements.length
            ? ai.education.requirements
            : adapted.understanding.semantic.educationRequirements,
        englishRequirement: ai.english.requirement,
        englishProficiency: ai.english.proficiency,
        internationalSignals: {
          overseasBusiness: ai.internationalSignals.overseasBusiness,
          globalTeam: ai.internationalSignals.globalTeam,
          englishUsage: ai.internationalSignals.englishUsage,
          crossBorderCollaboration: ai.internationalSignals.crossBorderCollaboration,
        },
      },
    },
    aiUnderstanding: ai,
    analysisSource: "gemini" as const,
  };
}

export async function analyzeUserJobText(
  input: UserJobImportInput,
): Promise<AIJobPipelineResult> {
  const base = parseUserJobText(input);

  try {
    const ai = await understandJobWithGemini(input.text);
    return applyAIToRaw(base, ai);
  } catch (error) {
    return {
      ...base,
      analysisSource: "deterministic",
      analysisWarning:
        error instanceof Error
          ? "AI analysis unavailable; deterministic parser was used as a fallback. " + error.message
          : "AI analysis unavailable; deterministic parser was used as a fallback.",
    };
  }
}
