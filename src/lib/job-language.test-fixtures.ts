/**
 * Development-safe test cases for detectJobLanguage.
 *
 * No test framework required. Run with:
 *   npx tsx src/lib/job-language.test-fixtures.ts
 *
 * Or import { runLanguageDetectionTests } from another context.
 */

import { detectJobLanguage } from "./job-language";
import type { JobLanguage } from "./job-understanding-types";

interface Case {
  name: string;
  input: Parameters<typeof detectJobLanguage>[0];
  expected: JobLanguage;
}

const cases: Case[] = [
  {
    name: "pure English JD",
    input: {
      title: "Product Manager",
      description: "We are looking for a product manager to lead our AI platform.",
      responsibilities: ["Define product roadmap", "Work with engineering teams"],
      skills: ["Product strategy", "User research"],
    },
    expected: "en",
  },
  {
    name: "pure Chinese JD",
    input: {
      title: "产品经理",
      description: "我们正在寻找一位有经验的产品经理来负责AI平台的产品规划。",
      responsibilities: ["制定产品路线图", "与工程团队协作"],
      skills: ["产品策略", "用户研究"],
    },
    expected: "zh",
  },
  {
    name: "Chinese JD with common abbreviations only",
    input: {
      title: "跨境电商运营",
      description: "负责SKU选品、SEO优化、广告投放和数据分析。",
      responsibilities: ["管理SKU", "优化SEO", "提升ROI"],
      skills: ["SEO", "SKU", "数据分析"],
    },
    expected: "zh",
  },
  {
    name: "mixed JD — Chinese title with English description",
    input: {
      title: "高级前端工程师",
      description:
        "We are looking for a senior frontend engineer with strong React experience. 需要熟悉组件库开发。",
      responsibilities: ["Build reusable components", "优化页面性能"],
      skills: ["React", "TypeScript", "前端开发"],
    },
    expected: "mixed",
  },
  {
    name: "empty input",
    input: {},
    expected: "unknown",
  },
  {
    name: "only numbers and symbols",
    input: {
      title: "12345",
      description: "!!! @#$ %",
      skills: ["996", "007"],
    },
    expected: "unknown",
  },
  {
    name: "English title with Chinese description",
    input: {
      title: "Product Designer",
      description: "负责产品的视觉设计和交互设计，需要与产品团队紧密合作。",
      responsibilities: ["制定设计规范", "与开发对接"],
      skills: ["Figma", "Sketch", "视觉设计"],
    },
    expected: "mixed",
  },
  {
    name: "Chinese JD with English skill names only (abbreviations filtered)",
    input: {
      title: "数据分析师",
      description: "使用SQL进行数据分析，熟悉BI工具。",
      responsibilities: ["编写SQL查询", "制作BI报表"],
      skills: ["SQL", "BI", "数据分析"],
    },
    expected: "zh",
  },
  {
    name: "meaningful English skill names in Chinese JD",
    input: {
      title: "全栈工程师",
      description: "负责公司内部平台开发，需要熟悉前后端技术栈。",
      responsibilities: ["维护现有系统", "开发新功能"],
      skills: ["Python", "PostgreSQL", "React", "Docker"],
    },
    expected: "mixed",
  },
];

export function runLanguageDetectionTests(): {
  passed: number;
  failed: number;
  results: Array<{ name: string; expected: JobLanguage; got: JobLanguage; pass: boolean }>;
} {
  let passed = 0;
  let failed = 0;
  const results = cases.map((c) => {
    const got = detectJobLanguage(c.input);
    const pass = got === c.expected;
    if (pass) {
      passed++;
    } else {
      failed++;
    }
    return { name: c.name, expected: c.expected, got, pass };
  });
  return { passed, failed, results };
}

// Run directly when executed as a script.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { passed, failed, results } = runLanguageDetectionTests();
  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    console.log(`  ${status}  ${r.name}  (expected: ${r.expected}, got: ${r.got})`);
  }
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}
