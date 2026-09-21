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

/**
 * Turns a pasted job listing into the source-neutral RawJob contract.
 * This is intentionally deterministic: it preserves the full pasted text
 * and only extracts obvious metadata when the listing provides labels.
 */
export function parseUserJobText(input: UserJobImportInput): UserJobImportResult {
  const text = input.text.trim();
  if (!text) throw new Error("Please paste a job description before importing.");

  const lines = text.split(/\\r?\\n/).map((line) => line.trim()).filter(Boolean);
  const title =
    labeled(text, ["title", "job title", "职位", "职位名称"]) ??
    lines.find((line) => !/^(company|location|地点|公司)\\s*[:：-]/i.test(line)) ??
    "Imported Job";

  const company =
    clean(input.companyName) ??
    labeled(text, ["company", "company name", "公司", "公司名称"]);

  const location =
    clean(input.locationText) ??
    labeled(text, ["location", "地点", "工作地点", "location / remote"]);

  const description = text.replace(/^\\s+|\\s+$/g, "");

  const raw = createRawJob({
    source: USER_IMPORT_SOURCE,
    rawTitle: title,
    rawDescription: description,
    ...(clean(input.sourceUrl) ? { sourceUrl: clean(input.sourceUrl)! } : {}),
    ...(company ? { companyName: company } : {}),
    ...(location ? { locationText: location } : {}),
  });

  const adapted = adaptRawJobToJob(raw);
  return {
    raw,
    job: adapted.job,
    warnings: adapted.warnings,
  };
}
