import type { Job } from "./types";
import { conceptLabel, resolveConcept } from "./concepts";
import type { JobRole, InternationalSignals } from "./job-understanding-types";

export interface JobEvidenceSignals {
  skills: string[];
  canonicalSkills: string[];
  aiRelevance?: number;
  growthPotential?: number;
  negativeTags?: Job["negativeTags"];
  evidence: string[];
}

/**
 * Turns explicit JD wording into conservative signals for the existing Career
 * Engine. It never replaces source facts and never changes the engine formula.
 */
export function extractJobEvidenceSignals(
  job: Job,
  role: JobRole,
  internationalSignals: InternationalSignals,
): JobEvidenceSignals {
  const text = [
    job.titleOriginal ?? job.title,
    job.summaryOriginal ?? job.summary,
    ...job.responsibilities,
    ...job.skills,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const skills: string[] = [];
  const evidence: string[] = [];

  const addSkill = (skill: string, terms: string[], label: string) => {
    if (terms.some((term) => text.includes(term))) {
      skills.push(skill);
      evidence.push(label);
    }
  };

  addSkill(
    "Overseas Market Research",
    ["市场分析", "市场调研", "市场研究", "market analysis", "market research"],
    "Explicit market-analysis/research requirement",
  );
  addSkill(
    "Competitor Analysis",
    ["竞品分析", "竞争对手分析", "competitor analysis", "competitive analysis"],
    "Explicit competitor-analysis requirement",
  );
  addSkill(
    "E-commerce Operations",
    ["电商运营", "电子商务运营", "e-commerce operations", "ecommerce operations", "店铺运营", "平台运营"],
    "Explicit e-commerce/operations wording",
  );
  addSkill(
    "Advertising Operations",
    ["广告投放", "广告运营", "推广", "paid ads", "advertising"],
    "Explicit advertising/promotion wording",
  );
  addSkill(
    "Social Media",
    ["social media", "facebook", "instagram", "linkedin", "社交媒体"],
    "Explicit social-media customer-development wording",
  );
  addSkill(
    "Email Marketing",
    ["email marketing", "邮件营销"],
    "Explicit email-marketing wording",
  );
  addSkill(
    "Project Coordination",
    [
      "项目进度跟踪",
      "项目进度",
      "进度跟踪",
      "跟进落实",
      "项目跟进",
      "项目协调",
      "project coordination",
      "project tracking",
    ],
    "Explicit project coordination/tracking requirement",
  );
  addSkill(
    "Technical Documentation",
    [
      "技术文档",
      "资料归档",
      "文档整理",
      "项目资料",
      "图纸",
      "试验报告",
      "technical documentation",
      "documentation",
    ],
    "Explicit technical-documentation requirement",
  );

  addSkill(
    "Data Monitoring",
    [
      "项目进度跟踪",
      "项目进度",
      "台账更新",
      "数据统计",
      "报表整理",
      "进度跟踪",
      "data tracking",
      "progress tracking",
      "reporting",
    ],
    "Explicit project tracking/reporting requirement",
  );

  let aiRelevance: number | undefined;
  if (/(ai|人工智能|generative ai|machine learning|自动化|automation)/i.test(text)) {
    aiRelevance = 75;
    evidence.push("Explicit AI/automation signal");
  } else if (/(电商|电子商务|e-commerce|ecommerce|temu|ebay|amazon)/i.test(text)) {
    aiRelevance = 45;
    evidence.push("Explicit e-commerce signal");
  }

  let growthPotential: number | undefined;
  if (/(晋升|职业发展|成长空间|培训|career growth|promotion|learning|development opportunity)/i.test(text)) {
    growthPotential = 70;
    evidence.push("Explicit growth/learning signal");
  }

  const negativeTags = new Set<Job["negativeTags"][number]>();
  if (
    role === "international-sales" ||
    /(销售|sales|business development|客户开发|开发客户)/i.test(text)
  ) {
    negativeTags.add("pure_sales");
    evidence.push("Sales/customer-development role signal");
  }
  // Handling customer complaints/follow-up inside a sales role is not the same
  // as being a customer-service role. Only an explicitly customer-service role
  // gets this negative tag.
  if (
    role === "customer-service" &&
    /(?:客服|客户服务|customer service|customer support)/i.test(text)
  ) {
    negativeTags.add("customer_service");
    evidence.push("Customer-service duty signal");
  }
  if (/(数据录入|录入员|data entry)/i.test(text)) {
    negativeTags.add("data_entry");
    evidence.push("Data-entry duty signal");
  }

  // International work is useful evidence, but is not itself AI relevance.
  if (internationalSignals.overseasBusiness || internationalSignals.englishUsage) {
    evidence.push("International/English work signal");
  }

  const canonicalSkills = [...new Set(skills.map((skill) => resolveConcept(skill)).filter(Boolean) as string[])];

  return {
    skills: [...new Set(skills)],
    canonicalSkills,
    ...(aiRelevance !== undefined ? { aiRelevance } : {}),
    ...(growthPotential !== undefined ? { growthPotential } : {}),
    ...(negativeTags.size ? { negativeTags: [...negativeTags] } : {}),
    evidence: [...new Set(evidence)],
  };
}
