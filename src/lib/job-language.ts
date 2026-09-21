/**
 * Lightweight, deterministic language detection for job listings.
 *
 * The heuristic counts Chinese characters and Latin alphabet characters across
 * the original source fields, then classifies the dominant language. Common
 * English abbreviations embedded in otherwise-Chinese JDs are ignored so that
 * a Chinese listing is not wrongly classified as "mixed".
 */

import type { JobLanguage } from "./job-understanding-types";

/** Abbreviations that appear in Chinese JDs but should not count as English content. */
const COMMON_ABBREVIATIONS = new Set([
  "ai",
  "ui",
  "ux",
  "ps",
  "hr",
  "ceo",
  "cto",
  "cfo",
  "coo",
  "seo",
  "sem",
  "sku",
  "crm",
  "erp",
  "saas",
  "b2b",
  "b2c",
  "api",
  "roi",
  "gm",
  "pr",
  "qa",
  "ui/ux",
  "o2o",
  "kpi",
  "okr",
  "mvp",
  "pm",
  "po",
  "bi",
  "id",
  "vi",
  "3d",
  "2d",
  "it",
  "app",
  "sdk",
  "cms",
  "cdn",
  "dns",
  "sql",
  "css",
  "html",
  "rwd",
]);

/**
 * CJK Unified Ideographs range plus CJK Extension A.
 * Does not include CJK punctuation (those are handled by the general
 * non-letter filter).
 */
const CJK_RANGE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

const LATIN_CHAR = /[a-zA-Z]/;

interface LanguageCounts {
  chineseChars: number;
  latinChars: number;
  latinTokens: number;
  meaningfulLatinTokens: number;
}

/** Split text into whitespace/punctuation-separated tokens and count meaningful Latin tokens. */
function countLatinTokens(text: string): { tokens: number; meaningful: number } {
  const tokens = text
    .split(/[\s,，。、；;：:（()）{}[\]"'`|/\\!?！？@#$%^&*+=<>~\-—–…·]+/)
    .filter(Boolean);

  let meaningful = 0;
  for (const token of tokens) {
    // Extract only the Latin-alphabet portion(s) of the token.
    // This handles mixed tokens like "AI平台" or "SEO优化" where the Latin
    // part is an abbreviation embedded in Chinese text.
    const latinPart = token.replace(/[^a-zA-Z]/g, "");
    if (latinPart.length === 0) continue;

    const lower = latinPart.toLowerCase();
    // Skip common abbreviations that appear in Chinese JDs.
    if (COMMON_ABBREVIATIONS.has(lower)) continue;
    // Skip single-letter tokens (likely initials or variables).
    if (latinPart.length < 2) continue;
    meaningful++;
  }

  return { tokens: tokens.length, meaningful };
}

function countField(text: string | undefined, acc: LanguageCounts): void {
  if (!text) return;
  for (const ch of text) {
    if (CJK_RANGE.test(ch)) {
      acc.chineseChars++;
    } else if (LATIN_CHAR.test(ch)) {
      acc.latinChars++;
    }
  }
  const { meaningful } = countLatinTokens(text);
  acc.meaningfulLatinTokens += meaningful;
}

function countArray(fields: string[] | undefined, acc: LanguageCounts): void {
  if (!fields) return;
  for (const field of fields) {
    countField(field, acc);
  }
}

/**
 * Detect the language of a job listing from its original source text.
 *
 * Classification logic:
 * - No meaningful Chinese characters AND no meaningful Latin tokens → "unknown"
 * - Chinese present with negligible English → "zh"
 * - English present with negligible Chinese → "en"
 * - Meaningful Chinese + meaningful English → "mixed"
 *
 * "Negligible English" means zero meaningful Latin tokens (after filtering
 * out common abbreviations). This prevents a Chinese JD that mentions "AI",
 * "SEO", or "SKU" from being classified as "mixed".
 */
export function detectJobLanguage(input: {
  title?: string;
  description?: string;
  responsibilities?: string[];
  skills?: string[];
}): JobLanguage {
  const acc: LanguageCounts = {
    chineseChars: 0,
    latinChars: 0,
    latinTokens: 0,
    meaningfulLatinTokens: 0,
  };

  countField(input.title, acc);
  countField(input.description, acc);
  countArray(input.responsibilities, acc);
  countArray(input.skills, acc);

  const hasChinese = acc.chineseChars > 0;
  const hasMeaningfulEnglish = acc.meaningfulLatinTokens > 0;

  if (!hasChinese && !hasMeaningfulEnglish) {
    return "unknown";
  }
  if (hasChinese && !hasMeaningfulEnglish) {
    return "zh";
  }
  if (!hasChinese && hasMeaningfulEnglish) {
    return "en";
  }
  return "mixed";
}
