/**
 * Canonical career concept taxonomy (bilingual data layer).
 *
 * Every skill, job title, responsibility or industry string in the app is
 * resolved to a canonical concept id before matching. Chinese and English
 * labels for the same professional concept resolve to the same id, so a
 * listing written as "产品开发专员" and one written as "Product Development
 * Specialist" both match the profile skill "Product Development".
 *
 * This is a data layer only: nothing here rewrites what the user sees.
 * The taxonomy is intentionally flat and easy to extend.
 */

export interface ConceptDef {
  /** Canonical id — the only thing the matching engine compares. */
  id: string;
  /** English labels; the first is the display label. */
  en: string[];
  /** Chinese labels. */
  zh: string[];
  /** Extra synonyms / phrasings in either language. */
  aliases?: string[];
  /** Adjacent concepts, for future expansion of partial credit. */
  related?: string[];
}

export const concepts: ConceptDef[] = [
  {
    id: "cross_border_ecommerce",
    en: ["Cross-border E-commerce Operations", "Cross-border E-commerce"],
    zh: ["跨境电商", "跨境电商运营", "跨境电商专员"],
    aliases: ["Cross border ecommerce", "Overseas e-commerce operations"],
    related: ["ecommerce_operations", "listing_optimization"],
  },
  {
    id: "overseas_market_research",
    en: ["Overseas Market Research", "International Market Research"],
    zh: ["海外市场研究", "海外市场调研", "海外市场分析"],
    related: ["market_research", "competitor_analysis"],
  },
  {
    id: "market_research",
    en: ["Market Research", "User Research"],
    zh: ["市场研究", "市场调研", "用户研究"],
    related: ["overseas_market_research"],
  },
  {
    id: "product_selection",
    en: ["Product Selection", "Merchandising / Selection"],
    zh: ["选品", "商品选品", "选品专员"],
    related: ["product_development", "market_research"],
  },
  {
    id: "product_development",
    en: ["Product Development", "Product Development Specialist", "Product Development Associate"],
    zh: ["产品开发", "商品开发", "产品研发", "产品开发专员"],
    related: ["product_selection", "product_management"],
  },
  {
    id: "competitor_analysis",
    en: ["Competitor Analysis", "Competitive Analysis"],
    zh: ["竞品分析", "竞争对手分析"],
    related: ["market_research"],
  },
  {
    id: "listing_optimization",
    en: ["Listing Optimization", "Listing Optimisation", "Conversion Optimization"],
    zh: ["Listing优化", "listing优化", "详情页优化", "转化优化"],
    related: ["copywriting", "ecommerce_operations"],
  },
  {
    id: "ecommerce_operations",
    en: ["E-commerce Operations", "Ecommerce Operations", "Store Operations"],
    zh: ["电商运营", "店铺运营"],
    related: ["cross_border_ecommerce", "advertising_operations"],
  },
  {
    id: "advertising_operations",
    en: ["Advertising Operations", "Paid Media", "Ad Operations"],
    zh: ["广告投放", "广告运营", "投流"],
    related: ["data_analysis"],
  },
  {
    id: "project_coordination",
    en: ["Project Coordination", "Project Coordination Support"],
    zh: ["项目协调", "项目跟进", "项目进度跟踪"],
    related: ["data_monitoring", "project_management"],
  },
  {
    id: "technical_documentation",
    en: ["Technical Documentation", "Documentation"],
    zh: ["技术文档", "文档整理", "资料归档"],
    related: ["project_coordination", "data_monitoring"],
  },
  {
    id: "data_monitoring",
    en: ["Data Monitoring", "Performance Monitoring", "Reporting"],
    zh: ["数据监控", "数据看板", "数据报表"],
    related: ["data_analysis"],
  },
  {
    id: "data_analysis",
    en: ["Data Analysis", "Analytics"],
    zh: ["数据分析", "业务分析"],
    related: ["data_monitoring"],
  },
  {
    id: "inventory_management",
    en: ["Inventory Management", "Stock Management"],
    zh: ["库存管理", "库存"],
    related: ["supply_chain_coordination"],
  },
  {
    id: "supply_chain_coordination",
    en: ["Inventory / Supply Chain Coordination", "Supply Chain Coordination", "Supply Chain"],
    zh: ["供应链", "供应链协调", "库存与供应链协调"],
    related: ["inventory_management"],
  },
  {
    id: "ai_product_image_generation",
    en: [
      "AI Product Image Generation",
      "AI Image Generation",
      "AI Visual",
      "AI-assisted Visual Creation",
    ],
    zh: ["AI产品图生成", "AI视觉", "AI绘图", "AI出图"],
    related: ["visual_design", "prompt_engineering"],
  },
  {
    id: "photoshop",
    en: ["Photoshop", "Adobe Photoshop", "Image Retouching"],
    zh: ["Photoshop", "PS", "修图"],
    related: ["visual_design"],
  },
  {
    id: "short_video_editing",
    en: ["Short Video Editing", "Video Editing"],
    zh: ["短视频剪辑", "视频剪辑", "短视频"],
    related: ["content_creation"],
  },
  {
    id: "basic_programming",
    en: ["Basic Programming", "Scripting", "Programming"],
    zh: ["基础编程", "编程", "脚本"],
    related: ["ai_automation"],
  },
  {
    id: "content_creation",
    en: ["Content Creation", "Content Production"],
    zh: ["内容创作", "内容制作"],
    related: ["content_operations", "copywriting"],
  },
  {
    id: "content_operations",
    en: ["Content Operations", "Content Marketing"],
    zh: ["内容运营", "新媒体运营"],
    related: ["content_creation"],
  },
  {
    id: "copywriting",
    en: ["Copywriting", "Copy"],
    zh: ["文案", "文案策划"],
    related: ["content_creation"],
  },
  {
    id: "visual_design",
    en: ["Visual Design", "Graphic Design", "Brand Design"],
    zh: ["视觉设计", "平面设计", "品牌设计"],
    related: ["ai_product_image_generation", "photoshop"],
  },
  {
    id: "ai_tools",
    en: ["AI Tools", "Generative AI", "AI Workflows"],
    zh: ["AI工具", "生成式AI", "AI工作流"],
    related: ["prompt_engineering", "ai_automation"],
  },
  {
    id: "prompt_engineering",
    en: ["Prompt Engineering", "Prompting"],
    zh: ["提示词", "提示词工程"],
    related: ["ai_tools"],
  },
  {
    id: "ai_automation",
    en: ["Automation", "AI Automation", "Workflow Automation"],
    zh: ["自动化", "AI自动化", "流程自动化"],
    related: ["basic_programming", "ai_tools"],
  },
  {
    id: "product_management",
    en: ["Product Management", "Product Manager", "Product Owner"],
    zh: ["产品经理", "产品管理"],
    related: ["product_development", "product_operations"],
  },
  {
    id: "product_operations",
    en: ["Product Operations"],
    zh: ["产品运营"],
    related: ["product_management"],
  },
  {
    id: "product_design",
    en: ["Product Design", "Product Designer"],
    zh: ["产品设计"],
    related: ["visual_design"],
  },
  {
    id: "customer_service",
    en: ["Customer Service", "Customer Support"],
    zh: ["客服", "客户服务"],
  },
  {
    id: "sales",
    en: ["Sales", "Sales Representative", "Business Development"],
    zh: ["销售", "销售代表", "商务拓展"],
  },
  {
    id: "data_entry",
    en: ["Data Entry"],
    zh: ["数据录入", "录入"],
  },
];

/** Loose key so "Cross border ecommerce" and "cross-border e-commerce" agree. */
function key(term: string) {
  const lower = term.trim().toLowerCase();
  // Latin text: strip punctuation and spacing. CJK is left intact.
  return lower.replace(/[\s._/\\()&,'"-]+/g, "");
}

const LOOKUP = new Map<string, string>();
for (const c of concepts) {
  for (const label of [...c.en, ...c.zh, ...(c.aliases ?? [])]) {
    LOOKUP.set(key(label), c.id);
  }
  LOOKUP.set(key(c.id), c.id);
  LOOKUP.set(c.id, c.id);
}

const BY_ID = new Map(concepts.map((c) => [c.id, c]));

/** Canonical concept id for a term, or undefined when the term is unknown. */
export function resolveConcept(term: string): string | undefined {
  if (!term) return undefined;
  const direct = LOOKUP.get(key(term));
  if (direct) return direct;
  // Fall back to a contained label, so "AI电商运营专员" still resolves.
  const k = key(term);
  for (const [label, id] of LOOKUP) {
    if (label.length >= 3 && k.includes(label)) return id;
  }
  return undefined;
}

/** Canonical id when known, otherwise a stable lowercase key for the raw term. */
export function conceptKey(term: string): string {
  return resolveConcept(term) ?? key(term);
}

export function conceptLabel(id: string): string {
  return BY_ID.get(id)?.en[0] ?? id;
}

export function relatedConcepts(id: string): string[] {
  return BY_ID.get(id)?.related ?? [];
}

export function sameConcept(a: string, b: string) {
  return conceptKey(a) === conceptKey(b);
}

/** Resolve a list of skill strings to unique canonical keys. */
export function normalizeSkillConcepts(terms: string[]): string[] {
  return [...new Set(terms.map(conceptKey))];
}
