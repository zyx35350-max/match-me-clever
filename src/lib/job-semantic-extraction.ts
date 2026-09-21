import type { Job } from "./types";
import type { JobSemanticExtraction } from "./job-understanding-types";

/**
 * Deterministic semantic extraction for raw jobs.
 *
 * V1.1.5 deliberately stays conservative:
 * - structured fields already supplied by the source are copied as facts;
 * - simple requirement phrases are extracted from the source wording;
 * - career directions are only added when the title/text contains explicit
 *   direction terms;
 * - nothing is invented when the listing is silent.
 */

const DIRECTION_RULES: Array<{ id: string; terms: string[] }> = [
  { id: "ai-ecommerce", terms: ["电商", "电子商务", "e-commerce", "ecommerce", "temu", "ebay", "amazon"] },
  { id: "ai-product", terms: ["产品经理", "产品负责人", "product manager", "product owner", "product management"] },
  { id: "ai-content", terms: ["内容运营", "内容创作", "内容策划", "content", "copywriter", "social media"] },
  { id: "ai-visual", terms: ["视觉设计", "视觉", "平面设计", "设计师", "visual", "graphic design", "creative designer"] },
  { id: "ai-operations", terms: ["运营", "operations", "运营经理", "运营专员"] },
];

const ENGLISH_REQUIRED_PATTERNS = [
  /(?:英语|英文|english)[^。；;\n]{0,32}(?:必须|required|must|mandatory|必需|流利|熟练|工作语言)/i,
  /(?:required|must|mandatory|fluent|proficient|working language)[^。；;\n]{0,32}(?:英语|英文|english)/i,
];

const ENGLISH_PREFERRED_PATTERNS = [
  /(?:英语|英文|english)[^。；;\n]{0,32}(?:优先|加分|preferred|plus|bonus|nice to have)/i,
  /(?:preferred|plus|bonus|nice to have)[^。；;\n]{0,32}(?:英语|英文|english)/i,
];

const EXPERIENCE_PATTERNS = [
  /(?:至少|不少于|最低|minimum of)\s*(\d+(?:\.\d+)?)\s*(?:年|years?)/i,
  /\b(\d+(?:\.\d+)?)\+?\s*years?\b/i,
  /(?:工作经验|经验要求|experience)[:：]?\s*([^。；;\n]+)/i,
];

const EDUCATION_PATTERNS = [
  /(?:本科|大专|专科|硕士|博士|学士|bachelor'?s?|master'?s?|phd|degree)/i,
];

function sourceText(job: Job): string {
  return [
    job.titleOriginal ?? job.title,
    job.summaryOriginal ?? job.summary,
    ...job.responsibilities,
    ...job.skills,
    job.industry ?? "",
  ].filter(Boolean).join("\n");
}

function includesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function extractRequirements(text: string, patterns: RegExp[]): string[] {
  const results: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) results.push(match[0].trim());
  }
  return [...new Set(results)];
}

function extractLanguageRequirements(text: string): string[] {
  const results: string[] = [];
  const languagePattern = /(英语|英文|english|中文|汉语|普通话|mandarin|language)[^。；;\n]{0,40}/gi;
  for (const match of text.matchAll(languagePattern)) {
    if (match[0]) results.push(match[0].trim());
  }
  return [...new Set(results)].slice(0, 5);
}

function extractCareerDirections(text: string): string[] {
  return DIRECTION_RULES
    .filter((rule) => includesAny(text, rule.terms))
    .map((rule) => rule.id);
}

function extractInternationalSignals(text: string): JobSemanticExtraction["internationalSignals"] {
  const signals: JobSemanticExtraction["internationalSignals"] = {};

  // Only set a signal when the wording gives direct evidence. In particular,
  // "global team" is kept independent from company ownership/type.
  if (/(海外业务|海外市场|国际市场|overseas business|overseas market|international market|global market|serving global customers)/i.test(text)) {
    signals.overseasBusiness = true;
  }

  if (/(全球团队|国际团队|global team|international team|distributed team|team across countries|cross[- ]border team)/i.test(text)) {
    signals.globalTeam = true;
  }

  if (/(英语|英文|english)[^。；;\n]{0,32}(?:沟通|交流|邮件|会议|工作|使用|communication|communicate|meetings|email|working language)/i.test(text) ||
      /(?:english communication|communicate in english|english-speaking environment|working language is english)/i.test(text)) {
    signals.englishUsage = true;
  }

  if (/(跨境协作|跨国协作|海外团队协作|国际协作|cross[- ]border collaboration|cross[- ]border cooperation|collaborat(?:e|ion) with (?:overseas|international|global) teams)/i.test(text)) {
    signals.crossBorderCollaboration = true;
  }

  return signals;
}

function detectEnglishRequirement(
  text: string,
  languageRequirements: string[],
): JobSemanticExtraction["englishRequirement"] {
  const evidence = [...new Set(languageRequirements)].filter((item) =>
    /(英语|英文|english)/i.test(item),
  );
  const combined = evidence.join("\n");

  // Only classify from language-specific evidence. A generic word such as
  // "English materials" must not become a hard requirement.
  if (combined && ENGLISH_REQUIRED_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "required";
  }
  if (combined && ENGLISH_PREFERRED_PATTERNS.some((pattern) => pattern.test(combined))) {
    return "preferred";
  }
  return "unknown";
}

/**
 * Extract semantic information without translating or mutating the original Job.
 */
export function extractJobSemantics(job: Job): JobSemanticExtraction {
  const text = sourceText(job);
  const languageRequirements = extractLanguageRequirements(text);

  return {
    title: job.titleOriginal ?? job.title,
    skills: [...job.skills],
    responsibilities: [...job.responsibilities],
    careerDirections: extractCareerDirections(text),
    experienceRequirements: extractRequirements(text, EXPERIENCE_PATTERNS),
    educationRequirements: extractRequirements(text, EDUCATION_PATTERNS),
    workMode: job.workMode,
    employmentType: job.employmentType,
    languageRequirements,
    englishRequirement: detectEnglishRequirement(text, languageRequirements),
    internationalSignals: extractInternationalSignals(text),
  };
}
