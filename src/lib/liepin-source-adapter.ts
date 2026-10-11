/**
 * Isolated, experimental Liepin job discovery adapter.
 *
 * It uses the page's ordinary public search flow and reads the search result
 * response exposed by that flow. It does not spoof browser fingerprints,
 * reuse cookies, solve challenges, or retry through access controls. Any
 * Liepin failure is returned as a Liepin-only FetchResult.
 */
import { chromium, type Browser, type Page } from "playwright";
import { createRawJob } from "./job-source";
import { deduplicateJobs } from "./job-dedup";
import type { FetchResult, JobSource, RawJob } from "./job-source-types";

export interface LiepinSearchTask {
  keyword: string;
  city?: string;
}

export interface LiepinRefreshJob {
  externalId: string;
  sourceUrl: string;
  rawTitle: string;
  rawDescription: string;
  companyName?: string;
  locationText?: string;
  metadata?: RawJob["metadata"];
}

export interface LiepinDiscoverOptions {
  searches: LiepinSearchTask[];
  refreshJobs?: LiepinRefreshJob[];
  targetCount?: number;
  maxPagesPerSearch?: number;
  delayMs?: number;
  headless?: boolean;
  excludeExternalIds?: string[];
  excludeSignatures?: string[];
}

export interface LiepinDiscoverResult extends FetchResult {
  enrichedJobs: RawJob[];
}

export const LIEPIN_SOURCE: JobSource = {
  id: "liepin",
  name: "Liepin",
  group: "domestic_apps",
  type: "job_board",
  accessPolicy: "public_page",
  enabled: false,
  description:
    "Experimental Liepin public job search. Stops when login, verification, or access restrictions appear.",
};

const SEARCH_API_MARKER = "searchfront4c.pc-search-job";
const CHALLENGE_PATTERN = /验证码|安全验证|人机验证|访问验证|滑块|captcha|verify you are human/i;
const LOGIN_PATTERN = /登录后查看|请先登录|扫码登录|手机号登录|微信登录/i;
const LIEPIN_CITY_CODES: Record<string, string> = {
  深圳: "050090",
  惠州: "050060",
  珠海: "050140",
};

function text(value: unknown): string {
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim();
  if (typeof value === "number") return String(value);
  return "";
}

function parseLiepinSalary(value: string): { min?: number; max?: number; note?: string } {
  const range = value.match(/(\d+(?:\.\d+)?)\s*(千|k|万)?\s*(?:-|–|—|~|～|至)\s*(\d+(?:\.\d+)?)\s*(千|k|万)/i);
  if (!range) return value ? { note: value } : {};
  const amount = (raw: string, unit?: string) =>
    Number(raw) * (unit?.toLowerCase() === "万" ? 10000 : 1000);
  return {
    min: amount(range[1]!, range[2] ?? range[4]),
    max: amount(range[3]!, range[4]),
    note: value,
  };
}

function locationMatchesCity(location: string | undefined, city: string | undefined): boolean {
  if (!location || !city) return false;
  if (/远程|居家办公|全国可远程|remote/i.test(location)) return true;
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "").replace(/[·•,，、/|_-]/g, "").replace(/市$/, "");
  return normalize(location).includes(normalize(city));
}

function isRelevantTitle(keyword: string, title: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, "");
  const normalizedTitle = title.toLowerCase().replace(/\s+/g, "");
  // Liepin searches the whole posting, so the AI term may appear only in the JD
  // and not in the title. Keep the user-facing product-role intent as the hard
  // boundary, and let semantic matching evaluate AI relevance later.
  if (!normalizedTitle.includes("产品") && !/product/i.test(normalizedTitle)) return false;

  // Exclude obvious sales/account roles that happen to contain “产品”.
  if (/(大客户|客户经理|销售|渠道|商务拓展|售前顾问)/.test(normalizedTitle)) return false;

  if (normalizedKeyword.includes("产品助理")) {
    return /(助理|assistant|专员|实习生)/i.test(normalizedTitle);
  }
  if (normalizedKeyword.includes("产品经理")) {
    return /(经理|负责人|总监|owner|productmanager|产品专家|产品策划|产品运营|产品专员|产品规划)/i.test(normalizedTitle);
  }
  return true;
}

function cleanLiepinDescription(value: string): string {
  const normalized = value
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const paragraphs = normalized.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const seenParagraphs = new Set<string>();
  const uniqueParagraphs = paragraphs.filter((paragraph) => {
    const key = paragraph.toLowerCase().replace(/\s+/g, " ");
    if (seenParagraphs.has(key)) return false;
    seenParagraphs.add(key);
    return true;
  });
  const lines = uniqueParagraphs.join("\n\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const line of lines) if (deduped.at(-1) !== line) deduped.push(line);

  // Remove a repeated contiguous block while preserving its first complete copy.
  let changed = true;
  while (changed && deduped.length >= 4) {
    changed = false;
    for (let size = Math.floor(deduped.length / 2); size >= 2; size -= 1) {
      let removed = false;
      for (let start = 0; start + size * 2 <= deduped.length; start += 1) {
        if (deduped.slice(start, start + size).every((line, offset) => line === deduped[start + size + offset])) {
          deduped.splice(start + size, size);
          changed = true;
          removed = true;
          break;
        }
      }
      if (removed) break;
    }
  }
  return deduped.join("\n");
}

const LIEPIN_DETAIL_SELECTORS = [
  '[data-selector="job-intro-content"]',
  ".job-intro-content",
  ".job-intro",
  ".job-description",
  ".job-desc",
  '[class*="job-intro-content"]',
  '[class*="job-description"]',
  '[class*="jobIntro"]',
  '[class*="jobDetail"]',
];


async function fetchLiepinDetail(page: Page, sourceUrl: string): Promise<{ status: "full" | "summary_only" | "blocked"; description?: string; message: string }> {
  try {
    const url = new URL(sourceUrl);
    if (!/^https:$/.test(url.protocol) || !(url.hostname === "liepin.com" || url.hostname.endsWith(".liepin.com"))) {
      return { status: "summary_only", message: "Skipped non-Liepin detail URL." };
    }

    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(900);
    let state = await accessState(page);
    if (state) return { status: "blocked", message: `Detail page requires ${state === "login" ? "login" : "verification"}; stopped.` };

    // Liepin renders job detail content asynchronously. Wait for the actual
    // description area or a visible JD heading instead of sampling the page
    // after a fixed sub-second delay.
    await page.waitForFunction((selectors: string[]) => {
      const hasDescription = selectors.some((selector) =>
        Array.from(document.querySelectorAll(selector)).some((element) =>
          (((element as HTMLElement).innerText ?? element.textContent ?? "").trim().length >= 80),
        ),
      );
      return hasDescription || /职位介绍|职位描述|岗位职责|工作职责|工作内容|任职要求|岗位要求/.test(document.body?.innerText ?? "");
    }, LIEPIN_DETAIL_SELECTORS, { timeout: 10000 }).catch(() => undefined);

    state = await accessState(page);
    if (state) return { status: "blocked", message: `Detail page requires ${state === "login" ? "login" : "verification"}; stopped.` };

    // Some public detail pages collapse the remainder of the description.
    // Expand only controls adjacent to a detected job-description container.
    await page.evaluate((selectors: string[]) => {
      const roots = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
      const visible = (element: Element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      };
      for (const root of roots) {
        const scope = root.parentElement?.parentElement ?? root.parentElement ?? root;
        const expand = Array.from(scope.querySelectorAll("button, a, [role='button']"))
          .find((element) => visible(element) && /^(展开|展开全部|查看更多|显示更多|查看全部|查看完整职位描述)$/.test((element as HTMLElement).innerText?.trim() ?? element.textContent?.trim() ?? ""));
        if (expand) {
          (expand as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, LIEPIN_DETAIL_SELECTORS).catch(() => false);
    await page.waitForTimeout(500);

    const extracted = await page.evaluate((selectors: string[]) => {
      const cleanText = (value: string) => value
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const elementText = (element: Element) =>
        cleanText((element as HTMLElement).innerText ?? element.textContent ?? "");

      // Prefer platform detail containers, choosing the fullest candidate so
      // nested wrappers do not truncate the responsibilities or requirements.
      let best = "";
      for (const selector of selectors) {
        for (const element of Array.from(document.querySelectorAll(selector))) {
          const value = elementText(element);
          if (value.length > best.length) best = value;
        }
      }
      if (best.length >= 80) return best;

      // Public JobPosting structured data is another source of the full JD.
      const jsonDescriptions: string[] = [];
      const visit = (node: unknown) => {
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        const types = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "");
        if (/JobPosting/i.test(types) && typeof record.description === "string") {
          const parsed = new DOMParser().parseFromString(record.description, "text/html");
          const value = cleanText(parsed.body.innerText || parsed.body.textContent || "");
          if (value.length >= 80) jsonDescriptions.push(value);
        }
        Object.values(record).forEach(visit);
      };
      for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
        try { visit(JSON.parse(script.textContent ?? "")); } catch { /* Ignore malformed structured data. */ }
      }
      if (jsonDescriptions.length) return jsonDescriptions.sort((a, b) => b.length - a.length)[0];

      // Last resort: keep the JD section from the rendered page and stop before
      // unrelated company, recommendation, and site-footer content.
      const body = cleanText(document.body?.innerText ?? "");
      const heading = body.search(/职位介绍|职位描述|岗位职责|工作职责|工作内容|任职要求|岗位要求/);
      if (heading < 0) return "";
      const trailing = body.slice(heading);
      const stop = trailing.search(/\n(?:公司介绍|公司简介|相似职位|推荐职位|职位推荐|猎聘温馨提示|工商信息|相关职位)/);
      return cleanText(stop > 100 ? trailing.slice(0, stop) : trailing);
    }, LIEPIN_DETAIL_SELECTORS).catch(() => "");
    const description = cleanLiepinDescription(extracted);
    return description.length >= 80
      ? { status: "full", description, message: `Full Liepin job description extracted (${description.length} characters).` }
      : { status: "summary_only", message: "No reliable full description found; retained search-card summary." };
  } catch (error) {
    return { status: "summary_only", message: error instanceof Error ? `Detail request failed: ${error.message}` : "Detail request failed." };
  }
}
function getRecords(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const nested = data?.data as Record<string, unknown> | undefined;
  return Array.isArray(nested?.jobCardList)
    ? nested!.jobCardList.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : [];
}

function asRawJob(item: Record<string, unknown>, keyword: string, city: string | undefined): RawJob | null {
  const job = (item.job && typeof item.job === "object" ? item.job : {}) as Record<string, unknown>;
  const company = (item.comp && typeof item.comp === "object" ? item.comp : {}) as Record<string, unknown>;
  const title = text(job.title);
  const companyName = text(company.compName);
  const jobId = text(job.jobId ?? item.jobId);
  const location = text(job.dq);
  const salary = text(job.salary);
  const salaryParsed = parseLiepinSalary(salary);
  const experience = text(job.requireWorkYears);
  const education = text(job.requireEduLevel);
  const cardDescription = [
    job.description,
    job.requirement,
    job.jobDesc,
    job.jobDescription,
    job.jobContent,
    job.positionDescription,
    job.workContent,
    item.description,
    item.jobDesc,
    item.jobDescription,
  ].map(text).filter((value) => value.length >= 80).sort((a, b) => b.length - a.length)[0] ?? "";
  const description = [
    text(job.title) && `职位名称：${text(job.title)}`,
    companyName && `公司：${companyName}`,
    location && `地点：${location}`,
    salary && `薪资：${salary}`,
    experience && `经验：${experience}`,
    education && `学历：${education}`,
    text(job.labels) && `标签：${text(job.labels)}`,
    cardDescription,
  ].filter(Boolean).join("\n");

  // Require a real title and stable platform identity; never import placeholder rows.
  if (!title || !jobId || /^(未知职位|职位|招聘信息)$/i.test(title)) return null;
  const sourceUrl = /^https?:\/\//i.test(text(job.link))
    ? text(job.link)
    : `https://www.liepin.com/job/${encodeURIComponent(jobId)}.shtml`;

  return createRawJob({
    source: LIEPIN_SOURCE,
    externalId: jobId,
    sourceUrl,
    rawTitle: title,
    rawDescription: description || title,
    ...(companyName ? { companyName } : {}),
    ...(location ? { locationText: location } : {}),
    metadata: {
      searchKeyword: keyword,
      ...(city ? { searchCity: city } : {}),
      ...(salary ? { salaryText: salary } : {}),
      ...(salaryParsed.min !== undefined ? { salaryMin: salaryParsed.min } : {}),
      ...(salaryParsed.max !== undefined ? { salaryMax: salaryParsed.max } : {}),
      ...(salaryParsed.note ? { salaryNote: salaryParsed.note } : {}),
      ...(experience ? { experienceText: experience } : {}),
      ...(education ? { educationText: education } : {}),
    },
  });
}

export function buildLiepinSearchUrl(keyword: string, city?: string) {
  const url = new URL("https://www.liepin.com/zhaopin/");
  url.searchParams.set("key", keyword);
  const cityName = city?.replace(/市$/, "").trim();
  const cityCode = cityName ? LIEPIN_CITY_CODES[cityName] : undefined;
  if (cityCode) url.searchParams.set("dqs", cityCode);
  return url.toString();
}

function getResponseCity(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = (payload as Record<string, unknown>).data as Record<string, unknown> | undefined;
  const nested = data?.data as Record<string, unknown> | undefined;
  const info = nested?.jobSubscribeInfo as Record<string, unknown> | undefined;
  return text(info?.dqName);
}

async function accessState(page: Page): Promise<"challenge" | "login" | null> {
  const visible = `${await page.title()}\n${await page.locator("body").innerText().catch(() => "")}`;
  if (CHALLENGE_PATTERN.test(visible)) return "challenge";
  if (LOGIN_PATTERN.test(visible)) return "login";
  return null;
}

async function waitForManualLogin(page: Page, timeoutMs = 120_000): Promise<"challenge" | "timeout" | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    const state = await accessState(page);
    if (state === "challenge") return "challenge";
    if (state === null) return null;
  }
  return "timeout";
}

export class LiepinJobSourceAdapter {
  readonly source = LIEPIN_SOURCE;

  async discover(input: unknown = {}): Promise<LiepinDiscoverResult> {
    const options = input as LiepinDiscoverOptions;
    const searches = Array.isArray(options?.searches) ? options.searches : [];
    const fetchedAt = new Date().toISOString();
    if (!searches.length) return { status: "failed", sourceId: this.source.id, fetchedAt, jobs: [], enrichedJobs: [], message: "No Liepin search tasks were supplied." };

    const targetCount = Math.max(1, Math.min(100, Math.floor(options.targetCount ?? 10)));
    const maxPages = Math.max(1, Math.min(10, Math.floor(options.maxPagesPerSearch ?? 10)));
    const delayMs = Math.max(1500, Math.min(5000, Math.floor(options.delayMs ?? 2000)));
    const jobs: RawJob[] = [];
    const enrichedJobs: RawJob[] = [];
    const reports: string[] = [];
    const knownIds = new Set((options.excludeExternalIds ?? []).map((id) => id.trim()).filter(Boolean));
    const savedSignatures = new Set(options.excludeSignatures ?? []);
    const knownSignatures = new Set(savedSignatures);
    let duplicateCardsRemoved = 0;
    let previouslySavedSkipped = 0;
    let detailIncomplete = false;
    let browser: Browser | undefined;
    let stopOnRestriction = false;

    try {
      browser = await chromium.launch({ headless: options.headless ?? false });
      const cityCount = new Set(searches.map((search) => search.city).filter(Boolean)).size || 1;
      const perCityTarget = Math.max(1, Math.ceil(targetCount / cityCount));
      const collectedByCity = new Map<string, number>();
      const exhaustedSearchKeys = new Set<string>();
      const page = await browser.newPage({ locale: "zh-CN", viewport: { width: 1440, height: 1000 } });
      // First distribute the requested batch across selected cities. If some
      // cities or keywords are sparse, make a second top-up pass instead of
      // returning early just because the first city quota was reached.
      for (let pass = 0; pass < 2 && jobs.length < targetCount && !stopOnRestriction; pass += 1) {
      if (pass === 1) reports.push("Liepin top-up pass: searching remaining pages and keyword/city combinations for additional new jobs.");
      for (const search of searches) {
        if (jobs.length >= targetCount || stopOnRestriction) break;
        const keyword = search.keyword.trim();
        if (!keyword) continue;
        const cityKey = search.city ?? "不限";
        const searchKey = `${keyword}|${cityKey}`;
        if (pass > 0 && exhaustedSearchKeys.has(searchKey)) continue;
        const cityAdded = collectedByCity.get(cityKey) ?? 0;
        const taskQuota = search.city
          ? pass === 0 ? Math.max(0, perCityTarget - cityAdded) : targetCount - jobs.length
          : targetCount - jobs.length;
        if (taskQuota === 0) continue;
        const captured = new Map<string, Record<string, unknown>>();
        let currentTaskAdded = 0;
        let confirmedCity = "";
        const onResponse = async (response: import("playwright").Response) => {
          if (!response.url().includes(SEARCH_API_MARKER)) return;
          try {
            const payload = await response.json();
            confirmedCity = getResponseCity(payload) || confirmedCity;
            for (const record of getRecords(payload)) {
              const candidate = asRawJob(record, keyword, search.city);
              if (candidate) captured.set(candidate.externalId!, record);
            }
          } catch { /* Ignore unrelated or unreadable responses. */ }
        };
        page.on("response", onResponse);
        try {
          await page.goto(buildLiepinSearchUrl(keyword, search.city), { waitUntil: "domcontentloaded", timeout: 25000 });
          await page.waitForTimeout(3500);
          let state = await accessState(page);
          if (state === "challenge") {
            reports.push(`${keyword}/${search.city ?? "不限"}: Liepin displayed a verification challenge; stopped without bypassing it.`);
            stopOnRestriction = true;
            break;
          }
          if (state === "login") {
            reports.push(`${keyword}/${search.city ?? "不限"}: Liepin requires login; waiting up to 2 minutes for manual sign-in in the opened browser.`);
            state = await waitForManualLogin(page);
            if (state === "challenge") {
              reports.push(`${keyword}/${search.city ?? "不限"}: a verification challenge appeared; stopped without bypassing it.`);
              stopOnRestriction = true;
              break;
            }
            if (state === "timeout") {
              reports.push(`${keyword}/${search.city ?? "不限"}: manual login was not completed within 2 minutes; stopped.`);
              stopOnRestriction = true;
              break;
            }
            await page.goto(buildLiepinSearchUrl(keyword, search.city), { waitUntil: "domcontentloaded", timeout: 25000 });
            await page.waitForTimeout(3500);
            state = await accessState(page);
            if (state) {
              reports.push(`${keyword}/${search.city ?? "不限"}: Liepin still requires ${state === "login" ? "login" : "verification"}; stopped.`);
              stopOnRestriction = true;
              break;
            }
          }
          let lastSignature = "";
          let pagesRead = 0;
          for (let pageNumber = 1; pageNumber <= maxPages && jobs.length < targetCount && currentTaskAdded < taskQuota; pageNumber += 1) {
            if (!captured.size) {
              reports.push(`${keyword}/${search.city ?? "不限"} page ${pageNumber}: no readable public search response.`);
              break;
            }
            const signature = [...captured.keys()].join(",");
            if (signature === lastSignature) {
              exhaustedSearchKeys.add(searchKey);
              break;
            }
            lastSignature = signature;
            pagesRead += 1;
            let productRoleCandidates = 0;
            for (const record of captured.values()) {
              const raw = asRawJob(record, keyword, search.city);
              if (!raw || !locationMatchesCity(raw.locationText, search.city) || !isRelevantTitle(keyword, raw.rawTitle)) continue;
              productRoleCandidates += 1;
              const id = raw.externalId ?? raw.sourceUrl ?? raw.id;
              if (knownIds.has(id)) {
                previouslySavedSkipped += 1;
                continue;
              }
              const signature = [raw.rawTitle, raw.companyName, raw.locationText, raw.metadata?.["salaryText"]]
                .map((part) => text(part).toLowerCase().replace(/\s+/g, ""))
                .join("|");
              if (raw.companyName && raw.locationText && knownSignatures.has(signature)) {
                if (savedSignatures.has(signature)) previouslySavedSkipped += 1;
                else duplicateCardsRemoved += 1;
                continue;
              }
              knownIds.add(id);
              knownSignatures.add(signature);
              jobs.push(raw);
              currentTaskAdded += 1;
              collectedByCity.set(cityKey, (collectedByCity.get(cityKey) ?? 0) + 1);
              if (jobs.length >= targetCount || currentTaskAdded >= taskQuota) break;
            }
            reports.push(`${keyword}/${search.city ?? "不限"} page ${pageNumber}: ${captured.size} result(s) read, ${productRoleCandidates} product-role candidate(s), ${currentTaskAdded} unique job(s) collected${confirmedCity ? `; platform city=${confirmedCity}` : ""}${duplicateCardsRemoved ? `; ${duplicateCardsRemoved} duplicate card(s) skipped` : ""}.`);
            if (pageNumber === maxPages) {
              exhaustedSearchKeys.add(searchKey);
              if (currentTaskAdded < taskQuota && jobs.length < targetCount) {
                reports.push(`${keyword}/${search.city ?? "不限"}: reached the ${maxPages}-page safety limit; this search was capped and does not prove the platform has no more jobs.`);
              }
              break;
            }
            if (jobs.length >= targetCount || currentTaskAdded >= taskQuota) break;
            const next = page.locator(".ant-pagination-next");
            if (!(await next.count()) || !(await next.isVisible().catch(() => false))) {
              exhaustedSearchKeys.add(searchKey);
              break;
            }
            const nextClass = await next.getAttribute("class") ?? "";
            if (nextClass.includes("ant-pagination-disabled") || await next.getAttribute("aria-disabled") === "true") {
              exhaustedSearchKeys.add(searchKey);
              break;
            }
            captured.clear();
            await page.waitForTimeout(delayMs);
            await next.click({ timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(3000);
            state = await accessState(page);
            if (state) {
              reports.push(`${keyword}/${search.city ?? "不限"}: Liepin displayed ${state === "login" ? "a login page" : "a verification challenge"}; stopped.`);
              stopOnRestriction = true;
              break;
            }
          }
          if (!stopOnRestriction && pagesRead === 0 && captured.size === 0) {
            reports.push(`${keyword}/${search.city ?? "不限"}: search returned no readable result cards.`);
          }
        } catch (error) {
          reports.push(`${keyword}/${search.city ?? "不限"}: ${error instanceof Error ? error.message : "request failed"}`);
        } finally {
          page.off("response", onResponse);
        }
        if (stopOnRestriction) break;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      }
      let detailBlocked = false;
      const refreshTargets = (options.refreshJobs ?? [])
        .filter((candidate) => candidate.externalId && candidate.sourceUrl && candidate.rawTitle)
        .slice(0, targetCount)
        .map((candidate) => ({
          existing: true,
          index: -1,
          raw: createRawJob({
            source: this.source,
            externalId: candidate.externalId,
            sourceUrl: candidate.sourceUrl,
            rawTitle: candidate.rawTitle,
            rawDescription: candidate.rawDescription,
            ...(candidate.companyName ? { companyName: candidate.companyName } : {}),
            ...(candidate.locationText ? { locationText: candidate.locationText } : {}),
            ...(candidate.metadata ? { metadata: candidate.metadata } : {}),
          }),
        }));
      const detailTargets = [
        ...refreshTargets,
        ...jobs.map((raw, index) => ({ existing: false, raw, index })),
      ];

      // Retry incomplete saved jobs first. A successful full description is
      // returned separately so it updates that saved record without counting
      // toward the requested number of new discovery results.
      for (const target of detailTargets) {
        const raw = target.raw;
        if (!raw.sourceUrl) { detailIncomplete = true; continue; }
        const detail = await fetchLiepinDetail(page, raw.sourceUrl);
        reports.push(`${raw.rawTitle}: ${detail.message}`);
        if (detail.status !== "full") detailIncomplete = true;
        if (detail.status === "full" && detail.description) {
          const completed: RawJob = {
            ...raw,
            rawDescription: detail.description,
            metadata: { ...(raw.metadata ?? {}), detailStatus: "full" },
          };
          if (target.existing) enrichedJobs.push(completed);
          else jobs[target.index] = completed;
        } else if (!target.existing) {
          jobs[target.index] = {
            ...raw,
            metadata: { ...(raw.metadata ?? {}), detailStatus: detail.status },
          };
        }
        if (detail.status === "blocked") {
          detailBlocked = true;
          break;
        }
        if (detailTargets.indexOf(target) < detailTargets.length - 1) await page.waitForTimeout(delayMs);
      }
      if (detailBlocked) reports.push("Liepin detail fetching stopped after a login or verification page; remaining jobs keep their search summaries. Search collection had already finished.");
      const unique = deduplicateJobs([], jobs).uniqueJobs.slice(0, targetCount);
      if (previouslySavedSkipped) reports.push(`${previouslySavedSkipped} previously saved Liepin result(s) skipped while searching for new unique jobs.`);
      return {
        status: unique.length >= targetCount && !detailIncomplete ? "success" : unique.length ? "partial" : "failed",
        sourceId: this.source.id,
        fetchedAt,
        jobs: unique,
        enrichedJobs,
        message: `Liepin discovery: ${unique.length}/${targetCount} requested unique job(s).\n${reports.join("\n")}`,
      };
    } catch (error) {
      const unique = deduplicateJobs([], jobs).uniqueJobs;
      return {
        status: unique.length ? "partial" : "failed",
        sourceId: this.source.id,
        fetchedAt,
        jobs: unique,
        enrichedJobs,
        message: `Liepin adapter failed after ${unique.length} job(s): ${error instanceof Error ? error.message : "unknown error"}`,
      };
    } finally {
      await browser?.close().catch(() => {});
    }
  }
}

export function createLiepinJobSourceAdapter() {
  return new LiepinJobSourceAdapter();
}
