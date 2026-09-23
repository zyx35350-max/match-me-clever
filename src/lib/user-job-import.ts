import { adaptRawJobToJob } from "./job-adapter";
import { createRawJob, USER_IMPORT_SOURCE } from "./job-source";
import type { Job } from "./types";

export interface UserJobImportInput {
  text: string;
  sourceUrl?: string;
  companyName?: string;
  locationText?: string;
}

export interface UserJobImportResult {
  raw: ReturnType<typeof createRawJob>;
  job: Job;
  understanding: ReturnType<typeof adaptRawJobToJob>["understanding"];
  warnings: string[];
}

function clean(value: string | undefined) {
  const next = value?.trim();
  return next ? next : undefined;
}

function labeled(text: string, labels: string[]) {
  for (const label of labels) {
    const re = new RegExp("^\s*" + label + "\s*[:：-]\s*(.+)\s*$", "im");
    const match = text.match(re);
    if (match?.[1]) return clean(match[1]);
  }
  return undefined;
}

function parseSalary(text: string): { min?: number; max?: number; note?: string } {
  const range = text.match(
    /(\d+(?:\.\d+)?)\s*(千|k|万)\s*(?:-|–|—|~|～|至)\s*(\d+(?:\.\d+)?)\s*(千|k|万)/i,
  );
  if (range) {
    const toNumber = (value: string, unit: string) => {
      const normalized = unit.toLowerCase();
      return Number(value) * (normalized === "万" ? 10000 : 1000);
    };
    return {
      min: toNumber(range[1]!, range[2]!),
      max: toNumber(range[3]!, range[4]!),
      note: range[0],
    };
  }

  const plainRange = text.match(
    /(\d{3,6})\s*(?:元|人民币|rmb)?\s*(?:-|–|—|~|～|至)\s*(\d{3,6})\s*(?:元|人民币|rmb)?/i,
  );
  if (plainRange) {
    return {
      min: Number(plainRange[1]),
      max: Number(plainRange[2]),
      note: plainRange[0],
    };
  }

  return {};
}

function parseExperience(text: string): string | undefined {
  const match = text.match(/(?:\d+(?:\.\d+)?年(?:及以上|以上)?|无需经验|经验不限)/);
  return clean(match?.[0]);
}

function isExperienceLine(line: string) {
  return /^(?:\d+(?:\.\d+)?年(?:及以上|以上)?|无需经验|经验不限)$/.test(line);
}

function looksLikeLocation(line: string) {
  return (
    /^(?:.+[-－—].+|.+(?:区|县|市|省))$/.test(line) &&
    !parseSalary(line) &&
    !isExperienceLine(line) &&
    !/^(?:中技|中专|高中|大专|本科|硕士|博士|英语|招\d+人|收藏|立即投递)$/.test(line)
  );
}

function isSectionHeader(line: string) {
  return /^(?:responsibilities|requirements|qualifications|职责|要求|任职要求|岗位要求|工作内容|description)[:：]?$/i.test(line);
}

function parseCompany(text: string, lines: string[]): string | undefined {
  const labeledCompany = labeled(text, ["company", "company name", "公司", "公司名称"]);
  if (labeledCompany) return labeledCompany;

  const companyLine = lines.find((line) =>
    /(?:有限公司|有限责任公司|股份有限公司|科技有限公司|集团有限公司|公司)$/.test(line),
  );
  return clean(companyLine);
}

/**
 * Deterministic parser for common Chinese recruitment-site pasted listings.
 * It preserves the complete original text and only extracts metadata supported
 * by the pasted source.
 */
export function parseUserJobText(input: UserJobImportInput): UserJobImportResult {
  const text = input.text.trim();
  if (!text) throw new Error("Please paste a job description before importing.");

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title =
    labeled(text, ["title", "job title", "职位", "职位名称"]) ??
    lines[0] ??
    "Imported Job";

  const company =
    clean(input.companyName) ??
    parseCompany(text, lines);

  // Search the full pasted listing, not just the first few header lines.
  // This handles recruitment-site layouts where salary appears after the
  // company/location/requirement rows.
  const salary = parseSalary(text);
  const experience =
    parseExperience(text);

  const location =
    clean(input.locationText) ??
    labeled(text, ["location", "地点", "工作地点", "location / remote"]) ??
    lines.slice(1, 7).find((line) => looksLikeLocation(line)) ??
    (lines[1] && !isSectionHeader(lines[1]) ? lines[1] : undefined);

  const raw = createRawJob({
    source: USER_IMPORT_SOURCE,
    rawTitle: title,
    rawDescription: text,
    ...(clean(input.sourceUrl) ? { sourceUrl: clean(input.sourceUrl)! } : {}),
    ...(company ? { companyName: company } : {}),
    ...(location ? { locationText: location } : {}),
    ...(salary.min !== undefined || salary.max !== undefined
      ? {
          metadata: {
            ...(salary.min !== undefined ? { salaryMin: salary.min } : {}),
            ...(salary.max !== undefined ? { salaryMax: salary.max } : {}),
          },
        }
      : {}),
  });

  const adapted = adaptRawJobToJob(raw, {
    defaults: {
      ...(salary.min !== undefined ? { salaryMin: salary.min } : {}),
      ...(salary.max !== undefined ? { salaryMax: salary.max } : {}),
    },
  });

  const understanding = {
    ...adapted.understanding,
    semantic: {
      ...adapted.understanding.semantic,
      experienceRequirements: [
        ...(experience ? [experience] : []),
        ...(adapted.understanding.semantic.experienceRequirements ?? []).filter(
          (item) => /\d+(?:\.\d+)?年/.test(item),
        ),
      ],
    },
  };

  return {
    raw,
    job: {
      ...adapted.job,
      ...(salary.note ? { salaryNote: salary.note } : {}),
    },
    understanding,
    warnings: adapted.warnings,
  };
}
