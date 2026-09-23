import type { Job } from "./types";
import type { JobSemanticExtraction, EnglishProficiency, JobRole } from "./job-understanding-types";

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
  {
    id: "ai-ecommerce",
    terms: ["电商", "电子商务", "e-commerce", "ecommerce", "temu", "ebay", "amazon"],
  },
  {
    id: "ai-product",
    terms: ["产品经理", "产品负责人", "product manager", "product owner", "product management"],
  },
  {
    id: "ai-content",
    terms: ["内容运营", "内容创作", "内容策划", "content", "copywriter", "social media"],
  },
  {
    id: "ai-visual",
    terms: [
      "视觉设计",
      "视觉",
      "平面设计",
      "设计师",
      "visual",
      "graphic design",
      "creative designer",
    ],
  },
  { id: "ai-operations", terms: ["运营", "operations", "运营经理", "运营专员"] },
];

const JOB_ROLE_RULES: Array<{ role: JobRole; titleTerms: string[]; bodyTerms: string[] }> = [
  {
    role: "international-sales",
    titleTerms: ["外贸业务", "外贸销售", "外贸业务员", "国际销售", "海外销售", "international sales", "international account"],
    bodyTerms: ["开发海外客户", "海外客户开发", "国际客户开发", "foreign customers", "overseas customers", "international customers"],
  },
  {
    role: "marketing",
    titleTerms: ["市场营销", "市场经理", "市场专员", "营销经理", "marketing manager", "marketing specialist", "marketer"],
    bodyTerms: ["市场营销", "marketing strategy", "market research", "营销策划"],
  },
  {
    role: "product",
    titleTerms: ["产品经理", "产品负责人", "产品专员", "product manager", "product owner", "product specialist"],
    bodyTerms: ["产品规划", "产品需求", "product roadmap", "product requirements"],
  },
  {
    role: "content",
    titleTerms: ["内容运营", "内容创作", "内容策划", "内容编辑", "content manager", "content creator", "content specialist", "copywriter"],
    bodyTerms: ["内容创作", "内容策划", "content creation", "content strategy", "copywriting"],
  },
  {
    role: "operations",
    titleTerms: ["运营经理", "运营专员", "运营主管", "运营岗位", "operations manager", "operations specialist", "operations coordinator"],
    bodyTerms: ["运营管理", "运营流程", "operations management", "operational processes"],
  },
  {
    role: "design",
    titleTerms: ["视觉设计", "平面设计", "设计师", "ui设计", "ux设计", "visual designer", "graphic designer", "ui designer", "ux designer"],
    bodyTerms: ["视觉设计", "平面设计", "visual design", "graphic design", "user interface design", "user experience design"],
  },
  {
    role: "software-engineering",
    titleTerms: ["软件工程师", "开发工程师", "前端工程师", "后端工程师", "软件开发", "software engineer", "software developer", "frontend engineer", "backend engineer"],
    bodyTerms: ["软件开发", "编程", "software development", "programming", "coding"],
  },
  {
    role: "project-assistant",
    titleTerms: ["研发项目助理", "项目助理", "项目协调员", "project assistant", "project coordinator"],
    bodyTerms: ["项目进度跟踪", "项目资料整理", "项目会议跟进", "project coordination", "project tracking"],
  },
  {
    role: "customer-service",
    titleTerms: ["客服", "客户服务", "客服专员", "customer service", "customer support", "support specialist"],
    bodyTerms: ["客户服务", "售后服务", "customer support", "customer service"],
  },
];

function findJobRole(job: Job, text: string): { role: JobRole; evidence: string[] } {
  const title = (job.titleOriginal ?? job.title ?? "").trim();
  const titleMatches: Array<{ role: JobRole; evidence: string[] }> = [];
  for (const rule of JOB_ROLE_RULES) {
    const matched = rule.titleTerms.find((term) => title.toLowerCase().includes(term.toLowerCase()));
    if (matched) titleMatches.push({ role: rule.role, evidence: [`标题含“${matched}”`] });
  }
  if (titleMatches.length) return titleMatches[0];

  for (const rule of JOB_ROLE_RULES) {
    const matched = rule.bodyTerms.find((term) => text.toLowerCase().includes(term.toLowerCase()));
    if (matched) return { role: rule.role, evidence: [`正文含“${matched}”`] };
  }
  return { role: "unknown", evidence: [] };
}

const ENGLISH_REQUIRED_PATTERNS = [
  /(?:英语|英文|english)[^。；;\n]{0,32}(?:必须|required|must|mandatory|必需|流利|熟练|工作语言)/i,
  /(?:required|must|mandatory|fluent|proficient|working language)[^。；;\n]{0,32}(?:英语|英文|english)/i,
  /(?:英语|英文)[^。；;\n]{0,8}(?:四级|六级)(?:及以上|以上)/,
  /CET-[46]\+/i,
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
  ]
    .filter(Boolean)
    .join("\n");
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
  const languagePattern =
    /(英语|英文|english|中文|汉语|普通话|mandarin|language)[^。；;\n]{0,40}/gi;
  for (const match of text.matchAll(languagePattern)) {
    if (match[0]) results.push(match[0].trim());
  }
  return [...new Set(results)].slice(0, 5);
}

function extractCareerDirections(text: string): string[] {
  return DIRECTION_RULES.filter((rule) => includesAny(text, rule.terms)).map((rule) => rule.id);
}

function extractInternationalSignals(text: string): JobSemanticExtraction["internationalSignals"] {
  const signals: JobSemanticExtraction["internationalSignals"] = {};

  // Only set a signal when the wording gives direct evidence. In particular,
  // "global team" is kept independent from company ownership/type.
  if (
    /(海外业务|海外市场|国际市场|overseas business|overseas market|international market|global market|serving global customers)/i.test(
      text,
    )
  ) {
    signals.overseasBusiness = true;
  }

  if (
    /(全球团队|国际团队|global team|international team|distributed team|team across countries|cross[- ]border team)/i.test(
      text,
    )
  ) {
    signals.globalTeam = true;
  }

  if (
    /(英语|英文|english)[^。；;\n]{0,32}(?:沟通|交流|邮件|会议|工作|使用|communication|communicate|meetings|email|working language)/i.test(
      text,
    ) ||
    /(?:english communication|communicate in english|english-speaking environment|working language is english)/i.test(
      text,
    )
  ) {
    signals.englishUsage = true;
  }

  if (
    /(跨境协作|跨国协作|海外团队协作|国际协作|cross[- ]border collaboration|cross[- ]border cooperation|collaborat(?:e|ion) with (?:overseas|international|global) teams)/i.test(
      text,
    )
  ) {
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
 * Proficiency patterns are checked in priority order: CET-6 variants first
 * (more specific), then CET-4, then proficiency descriptors. Each pattern
 * captures the matched source text so evidence is always grounded in the
 * original wording.
 */
const PROFICIENCY_RULES: Array<{
  proficiency: EnglishProficiency;
  patterns: RegExp[];
}> = [
  {
    proficiency: "CET-6+",
    patterns: [/英语六级(?:及以上|以上)/, /CET-6\+/i, /cet[\s-]?6\s*(?:及以上|以上|or\s*above)/i],
  },
  {
    proficiency: "CET-6",
    patterns: [/英语六级/, /\bCET-6\b/i, /\bcet[\s-]?6\b/i],
  },
  {
    proficiency: "CET-4+",
    patterns: [/英语四级(?:及以上|以上)/, /CET-4\+/i, /cet[\s-]?4\s*(?:及以上|以上|or\s*above)/i],
  },
  {
    proficiency: "CET-4",
    patterns: [/英语四级/, /\bCET-4\b/i, /\bcet[\s-]?4\b/i],
  },
  {
    proficiency: "fluent_speaking",
    patterns: [/英语口语流利/, /(?:英语|英文)[^。；;\n]{0,8}口语流利/],
  },
  {
    proficiency: "fluent",
    patterns: [/英语流利/, /(?:英语|英文)[^。；;\n]{0,4}流利/],
  },
  {
    proficiency: "proficient_all",
    patterns: [/英语听说读写熟练/, /(?:英语|英文)[^。；;\n]{0,8}听说读写熟练/],
  },
  {
    proficiency: "proficient_reading_writing",
    patterns: [/英语读写熟练/, /(?:英语|英文)[^。；;\n]{0,8}读写熟练/],
  },
  {
    proficiency: "working_proficiency",
    patterns: [/工作英语/, /(?:英语|english)[^。；;\n]{0,8}工作能力/i],
  },
];

function detectEnglishProficiency(text: string): EnglishProficiency {
  for (const rule of PROFICIENCY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return rule.proficiency;
      }
    }
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
    jobRole: findJobRole(job, text).role,
    jobRoleEvidence: findJobRole(job, text).evidence,
    experienceRequirements: extractRequirements(text, EXPERIENCE_PATTERNS),
    educationRequirements: extractRequirements(text, EDUCATION_PATTERNS),
    workMode: job.workMode,
    ...(job.employmentType ? { employmentType: job.employmentType } : {}),
    languageRequirements,
    englishRequirement: detectEnglishRequirement(text, languageRequirements),
    englishProficiency: detectEnglishProficiency(text),
    internationalSignals: extractInternationalSignals(text),
  };
}
