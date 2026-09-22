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
    const re = new RegExp(`^\\s*${label}\\s*[:：-]\\s*(.+)\\s*$`, "im");
    const match = text.match(re);
    if (match?.[1]) return clean(match[1]);
  }
  return undefined;
}

function parseSalary(text: string): { min?: number; max?: number; note?: string } {
  const match = text.match(
    /(\\d+(?:\\.\\d+)?)\\s*(千|万)\\s*(?:-|~|至)\\s*(\\d+(?:\\.\\d+)?)\\s*(千|万)/i,
  );
  if (!match) return {};

  const toNumber = (value: string, unit: string) =>
    Number(value) * (unit === "万" ? 10000 : 1000);

  return {
    min: toNumber(match[1], match[2]),
    max: toNumber(match[3], match[4]),
    note: match[0],
  };
}

function parseExperience(text: string): string | undefined {
  const match = text.match(/\\d+(?:\\.\\d+)?年(?:及以上|以上)?|无需经验|经验不限/);
  return clean(match?.[0]);
}

/**
 * Deterministic parser for pasted job listings.
 * It preserves the complete original text and only extracts metadata supported
 * by the pasted source, including common Chinese recruitment-site formats.
 */
export function parseUserJobText(input: UserJobImportInput): UserJobImportResult {
  const text = input.text.trim();
  if (!text) throw new Error("Please paste a job description before importing.");

  const lines = text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);

  const title =
    labeled(text, ["title", "job title", "职位", "职位名称"]) ??
    lines[0] ??
    "Imported Job";

  const company =
    clean(input.companyName) ??
    labeled(text, ["company", "company name", "公司", "公司名称"]);

  const header = lines.slice(0, 8).join(" ");
  const salary = parseSalary(header);
  const experience = parseExperience(header);

  const location =
    clean(input.locationText) ??
    labeled(text, ["location", "地点", "工作地点", "location / remote"]) ??
    clean(lines[2]?.match(/^(.+?)(?=\\d+(?:\\.\\d+)?年|无需经验|经验不限)/)?.[1]) ??
    (lines[2] && !/\\d+(?:\\.\\d+)?年|无需经验|经验不限/.test(lines[2]) ? lines[2] : undefined);

  const description = text;

  const raw = createRawJob({
    source: USER_IMPORT_SOURCE,
    rawTitle: title,
    rawDescription: description,
    ...(clean(input.sourceUrl) ? { sourceUrl: clean(input.sourceUrl)! } : {}),
    ...(company ? { companyName: company } : {}),
    ...(location ? { locationText: location } : {}),
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
        ...adapted.understanding.semantic.experienceRequirements,
        ...(experience ? [experience] : []),
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
