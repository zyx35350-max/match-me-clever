/**
 * 51Job source adapter — V2
 *
 * Server/Node-only discovery adapter.
 *
 * Responsibilities:
 * - Search 51Job with multiple keyword + jobArea combinations.
 * - Paginate by using the page's own "下一页" control; no guessed page parameter.
 * - Read discovery fields from the main search result list.
 * - Open each real job URL and fetch the detail page for the full JD.
 * - Convert results into the existing RawJob contract.
 * - Deduplicate across keywords/cities/pages using the existing dedup layer.
 *
 * Non-responsibilities:
 * - No semantic scoring.
 * - No Gemini/AI understanding.
 * - No CAPTCHA/login bypass.
 * - No direct browser use from client UI.
 */

import { chromium, type Browser, type Page } from "playwright";
import { createRawJob } from "./job-source";
import { deduplicateJobs } from "./job-dedup";
import type { FetchResult, JobSource, RawJob } from "./job-source-types";

export interface FiftyOneJobSearchTask {
  keyword: string;
  jobArea?: string;
  maxPages?: number;
}

export interface FiftyOneJobDiscoverOptions {
  searches: FiftyOneJobSearchTask[];
  /** Desired number of unique jobs to collect across all searches. */
  targetCount?: number;
  /** Safety valve only; users do not need to set this. */
  maxPagesPerSearch?: number;
  /** Delay between source requests. */
  delayMs?: number;
  /** Delay between detail-page requests. */
  detailDelayMs?: number;
  headless?: boolean;
}

export type FiftyOneJobDetailStatus = "full" | "summary_only" | "not_found" | "blocked";

export interface FiftyOneJobDetailResult {
  status: FiftyOneJobDetailStatus;
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  postedAt?: string;
  description?: string;
  message?: string;
}

interface SearchCard {
  pageCode: string | null;
  jobId: string | null;
  title: string | null;
  company: string | null;
  salary: string | null;
  location: string | null;
  rawText: string;
}

interface SearchApiItem {
  jobId?: string | number | null;
  jobHref?: string | null;
}

export const FIFTYONEJOB_SOURCE: JobSource = {
  id: "51job",
  name: "51Job",
  group: "domestic_apps",
  type: "job_board",
  accessPolicy: "public_page",
  // Keep disabled in the generic source list until the user explicitly
  // enables automated discovery. The adapter can still be exercised directly.
  enabled: false,
  description:
    "51Job public search pages. Automated discovery must respect 51Job's access controls, terms and rate limits.",
};

const DEFAULT_SEARCH_BASE = "https://we.51job.com/pc/search";
const VERIFY_PATTERNS = [
  /验证码|滑块|拖动|安全验证|人机验证|访问验证|verify|captcha|geetest|nc_|slider/i,
];
const LOGIN_PATTERNS = [/请登录|登录后查看|扫码登录/];
const DETAIL_NOT_FOUND_PATTERNS = [
  /该职位已下线|该职位已删除|职位不存在|职位已关闭|职位已结束|没有找到相关职位/i,
];

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Search-card text is only a compact discovery snapshot, not the full JD.
 * Some 51Job cards render the same text block more than once for different
 * interaction layers. Collapse exact duplicate lines and adjacent repeated
 * blocks while preserving the first occurrence and original order.
 */
export function clean51JobSearchText(value: string | null | undefined) {
  const lines = (value ?? "")
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const dedupedLines: string[] = [];
  for (const line of lines) {
    if (dedupedLines.at(-1) !== line) dedupedLines.push(line);
  }

  // Some search cards flatten their contents into one long text node and
  // repeat the same payload back-to-back. Collapse exact whole-string repeats
  // before applying the line/block dedupe below.
  for (let i = 0; i < dedupedLines.length; i += 1) {
    const line = dedupedLines[i]!;
    if (line.length < 20) continue;

    for (let split = Math.floor(line.length / 2); split >= 20; split -= 1) {
      const left = line.slice(0, split).trim();
      const right = line.slice(split).trim();
      if (left && left === right) {
        dedupedLines[i] = left;
        break;
      }
    }
  }

  let changed = true;
  while (changed && dedupedLines.length >= 4) {
    changed = false;

    for (let blockSize = Math.floor(dedupedLines.length / 2); blockSize >= 2; blockSize -= 1) {
      let removed = false;

      for (let start = 0; start + blockSize * 2 <= dedupedLines.length; start += 1) {
        let same = true;
        for (let offset = 0; offset < blockSize; offset += 1) {
          if (dedupedLines[start + offset] !== dedupedLines[start + blockSize + offset]) {
            same = false;
            break;
          }
        }

        if (!same) continue;

        dedupedLines.splice(start + blockSize, blockSize);
        removed = true;
        changed = true;
        break;
      }

      if (removed) break;
    }
  }

  return dedupedLines.join("\n");
}


export function clean51JobDetailText(value: string | null | undefined) {
  const lines = (value ?? "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const deduped: string[] = [];
  for (const line of lines) {
    if (deduped.at(-1) !== line) deduped.push(line);
  }

  // Some responsive layouts mount the same detail block more than once.
  let changed = true;
  while (changed && deduped.length >= 4) {
    changed = false;
    for (let blockSize = Math.floor(deduped.length / 2); blockSize >= 2; blockSize -= 1) {
      let removed = false;
      for (let start = 0; start + blockSize * 2 <= deduped.length; start += 1) {
        let same = true;
        for (let offset = 0; offset < blockSize; offset += 1) {
          if (deduped[start + offset] !== deduped[start + blockSize + offset]) {
            same = false;
            break;
          }
        }
        if (!same) continue;
        deduped.splice(start + blockSize, blockSize);
        changed = true;
        removed = true;
        break;
      }
      if (removed) break;
    }
  }

  const flattened = deduped.join("\n");
  if (flattened.length >= 40) {
    for (let split = Math.floor(flattened.length / 2); split >= 40; split -= 1) {
      const left = flattened.slice(0, split).trim();
      const right = flattened.slice(split).trim();
      if (left && left === right) return left;
    }
  }

  return flattened;
}

export async function extract51JobDetail(page: Page): Promise<FiftyOneJobDetailResult> {
  const snapshot = await page.evaluate(() => {
    const text = (selector: string) => {
      const element = document.querySelector(selector);
      return (element?.innerText ?? element?.textContent ?? "").trim();
    };

    const bodyText = document.body?.innerText ?? "";
    const detailSelectors = [
      ".bmsg.job_msg.inbox",
      ".bmsg.job_msg",
      ".job_msg.inbox",
      '[class*="job_msg"]',
    ];

    let description = "";
    for (const selector of detailSelectors) {
      const candidate = text(selector);
      if (candidate.length >= 30) {
        description = candidate;
        break;
      }
    }

    const title = text(".cn h1") || text(".tHeader h1") || text("h1");
    const company = text(".cn .cname a") || text(".cn .cname") || text(".com_name");
    const salary = text(".cn strong") || text(".cn .lname");
    const locationSource =
      text(".cn p.msg.ltype") || text(".cn .msg") || text(".tHeader .msg");

    return {
      bodyText,
      title,
      company,
      salary,
      locationSource,
      pageTitle: document.title,
      description,
    };
  });

  if (
    DETAIL_NOT_FOUND_PATTERNS.some((pattern) =>
      pattern.test(snapshot.pageTitle + "\n" + snapshot.bodyText),
    )
  ) {
    return {
      status: "not_found",
      title: snapshot.title || undefined,
      company: snapshot.company || undefined,
      message: "51Job detail page reports that the listing is no longer available.",
    };
  }

  const description = clean51JobDetailText(snapshot.description);
  if (description.length < 30) {
    return {
      status: "summary_only",
      title: snapshot.title || undefined,
      company: snapshot.company || undefined,
      salary: snapshot.salary || undefined,
      message: "Detail page loaded, but no reliable full JD section was found.",
    };
  }

  const parts = snapshot.locationSource
    .split("|")
    .map((part) => cleanText(part))
    .filter(Boolean);

  return {
    status: "full",
    title: snapshot.title || undefined,
    company: snapshot.company || undefined,
    salary: snapshot.salary || undefined,
    location: parts[0] || undefined,
    postedAt: parts.at(-1) || undefined,
    description,
  };
}

async function fetch51JobDetail(page: Page, url: string): Promise<FiftyOneJobDetailResult> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    if (await hasVerification(page)) {
      return {
        status: "blocked",
        message: "Verification detected on the 51Job detail page; stopped without bypassing.",
      };
    }

    return await extract51JobDetail(page);
  } catch (error) {
    return {
      status: "summary_only",
      message:
        error instanceof Error
          ? "Detail page request failed: " + error.message
          : "Detail page request failed.",
    };
  }
}

export function build51JobSearchUrl(keyword: string, jobArea?: string) {
  const url = new URL(DEFAULT_SEARCH_BASE);
  url.searchParams.set("keyword", keyword);
  if (jobArea) url.searchParams.set("jobArea", jobArea);
  return url.toString();
}

function extractJobId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/\/(\d{5,})\.html(?:[?#]|$)/i);
  return match?.[1] ?? null;
}

function looksLikeJobUrl(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)51job\.com$/i.test(parsed.hostname) &&
      /\/\d{5,}\.html(?:$|[?#])/i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

export function parse51JobSalary(text: string | null): {
  min?: number;
  max?: number;
  note?: string;
} {
  const value = cleanText(text);
  if (!value) return {};

  const range = value.match(
    /(\d+(?:\.\d+)?)\s*(千|k|万)?\s*(?:-|–|—|~|～|至)\s*(\d+(?:\.\d+)?)\s*(千|k|万)/i,
  );

  if (range) {
    const inferredMaxUnit = range[4];
    const inferredMinUnit = range[2] ?? inferredMaxUnit;

    const toNumber = (raw: string, unit?: string) => {
      const normalized = (unit ?? "千").toLowerCase();
      return Number(raw) * (normalized === "万" ? 10000 : normalized === "k" ? 1000 : 1000);
    };

    return {
      min: toNumber(range[1]!, inferredMinUnit),
      max: toNumber(range[3]!, inferredMaxUnit),
      note: value,
    };
  }

  return { note: value };
}

function searchCardToRawJob(
  card: SearchCard,
  task: FiftyOneJobSearchTask,
  pageNumber: number,
  hrefByJobId: Map<string, string>,
  fetchedAt: string,
): RawJob | null {
  const jobId =
    card.jobId && /^\d+$/.test(String(card.jobId)) ? String(card.jobId) : null;
  const href = jobId ? hrefByJobId.get(jobId) ?? null : null;
  const url =
    href && looksLikeJobUrl(href) && extractJobId(href) === jobId ? href : null;

  // A source adapter should not create identity-ambiguous records.
  if (!jobId || !url || !card.title) return null;

  const salary = parse51JobSalary(card.salary);

  return createRawJob({
    source: FIFTYONEJOB_SOURCE,
    externalId: jobId,
    sourceUrl: url,
    rawTitle: cleanText(card.title),
    rawDescription: clean51JobSearchText(card.rawText),
    ...(card.company ? { companyName: cleanText(card.company) } : {}),
    ...(card.location ? { locationText: cleanText(card.location) } : {}),
    fetchedAt,
    metadata: {
      searchKeyword: task.keyword,
      ...(task.jobArea ? { searchJobArea: task.jobArea } : {}),
      searchPage: pageNumber,
      pageCode: card.pageCode,
      ...(salary.min !== undefined ? { salaryMin: salary.min } : {}),
      ...(salary.max !== undefined ? { salaryMax: salary.max } : {}),
      ...(salary.note ? { salaryNote: salary.note } : {}),
    },
  });
}

function isSearchApiResponse(url: string) {
  return /\/api\/job\/search-pc(?:\?|$)/.test(url);
}

interface CapturedSearchApi {
  hrefByJobId: Map<string, string>;
  requestUrls: string[];
}

async function captureSearchApiItems(
  page: Page,
): Promise<CapturedSearchApi & { stop: () => void }> {
  const hrefByJobId = new Map<string, string>();
  const requestUrls: string[] = [];

  const requestHandler = (request: import("playwright").Request) => {
    if (isSearchApiResponse(request.url())) {
      requestUrls.push(request.url());
    }
  };

  const responseHandler = async (response: import("playwright").Response) => {
    if (!isSearchApiResponse(response.url())) return;

    try {
      const text = await response.text();
      if (!text.trim().startsWith("{")) return;

      const items = (JSON.parse(text)?.resultbody?.job?.items ?? []) as SearchApiItem[];
      for (const item of items) {
        if (item?.jobId && item?.jobHref) {
          hrefByJobId.set(String(item.jobId), String(item.jobHref));
        }
      }
    } catch {
      // Ignore unreadable auxiliary responses.
    }
  };

  page.on("request", requestHandler);
  page.on("response", responseHandler);

  return {
    hrefByJobId,
    requestUrls,
    stop: () => {
      page.off("request", requestHandler);
      page.off("response", responseHandler);
    },
  };
}

function discoverPageParam(apiUrl: string | undefined) {
  if (!apiUrl) return null;
  try {
    const parsed = new URL(apiUrl);
    const preferred = ["pageNum", "pageNo", "pageIndex", "page", "currentPage"];
    for (const key of preferred) {
      const value = parsed.searchParams.get(key);
      if (value !== null && /^\d+$/.test(value)) return { key, initialValue: Number(value) };
    }
    for (const [key, value] of parsed.searchParams.entries()) {
      if (/page/i.test(key) && !/size|total|count/i.test(key) && /^\d+$/.test(value)) {
        return { key, initialValue: Number(value) };
      }
    }
  } catch {}
  return null;
}

function parseSearchApiPayload(text: string) {
  if (!text.trim().startsWith("{")) return null;
  try {
    const payload = JSON.parse(text);
    const job = payload?.resultbody?.job;
    if (!job || !Array.isArray(job.items)) return null;
    return job;
  } catch {
    return null;
  }
}

async function fetchSearchApiPage(page: Page, firstApiUrl: string, pageNumber: number) {
  const pageParam = discoverPageParam(firstApiUrl);
  if (!pageParam || pageParam.initialValue === pageNumber) return null;
  const target = new URL(firstApiUrl);
  target.searchParams.set(pageParam.key, String(pageNumber));
  const result = await page.evaluate(async (url) => {
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json, text/plain, */*" },
    });
    return { status: response.status, url: response.url, text: await response.text() };
  }, target.toString());
  if (result.status >= 400) throw new Error("51Job search API page " + pageNumber + " returned HTTP " + result.status);
  return { requestUrl: result.url, payload: parseSearchApiPayload(result.text) };
}

function searchApiItemToCard(item: Record<string, unknown>): SearchCard | null {
  const jobId = item.jobId ? String(item.jobId) : null;
  const title = item.jobName ? cleanText(String(item.jobName)) : null;
  const company = item.fullCompanyName
    ? cleanText(String(item.fullCompanyName))
    : item.companyName
      ? cleanText(String(item.companyName))
      : null;
  const salary = item.provideSalaryString ? cleanText(String(item.provideSalaryString)) : null;
  const location = item.jobAreaString ? cleanText(String(item.jobAreaString)) : null;
  if (!jobId || !title) return null;
  const description = item.jobDescribe
    ? clean51JobSearchText(String(item.jobDescribe))
    : clean51JobSearchText(JSON.stringify(item));
  return {
    pageCode: typeof item.pageCode === "string" ? item.pageCode : "sou|sou|soulb",
    jobId,
    title,
    company,
    salary,
    location,
    rawText: description,
  };
}

async function extractMainSearchCards(page: Page): Promise<SearchCard[]> {
  return page.evaluate(() => {
    return [...document.querySelectorAll(".joblist .joblist-item")]
      .map((item) => {
        const job = item.querySelector(".joblist-item-job[sensorsdata]");
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(job?.getAttribute("sensorsdata") ?? "{}");
        } catch {}

        const titleEl = item.querySelector(".jname");
        const companyEl = item.querySelector(".cname");
        const salaryEl = item.querySelector(".sal");
        const areaShrinkEl = item.querySelector(".area .shrink-0");
        const areaEl = item.querySelector(".area");

        return {
          pageCode: typeof meta.pageCode === "string" ? meta.pageCode : null,
          jobId: meta.jobId ? String(meta.jobId) : null,
          title:
            titleEl?.getAttribute("title")?.trim() ||
            (titleEl?.textContent ?? "").replace(/\s+/g, " ").trim() ||
            null,
          company:
            companyEl?.getAttribute("title")?.trim() ||
            (companyEl?.textContent ?? "").replace(/\s+/g, " ").trim() ||
            null,
          salary:
            (salaryEl?.textContent ?? "").replace(/\s+/g, " ").trim() || null,
          location:
            (areaShrinkEl?.textContent ?? "").replace(/\s+/g, " ").trim() ||
            (areaEl?.textContent ?? "").replace(/\s+/g, " ").trim() ||
            null,
          rawText: (item as HTMLElement).innerText?.trim() ?? "",
        };
      })
      .filter((card) => !card.pageCode || card.pageCode.endsWith("soulb"));
  });
}

async function isUsablePaginationControl(locator: import("playwright").Locator) {
  if ((await locator.count()) === 0) return false;

  return locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      rect.width > 0 &&
      rect.height > 0 &&
      (el as HTMLButtonElement).disabled !== true &&
      el.getAttribute("aria-disabled") !== "true" &&
      !el.classList.contains("disabled")
    );
  }).catch(() => false);
}

async function findNextPageControl(page: Page, nextPageNumber: number) {
  // Strategy 1: explicit next-page semantics.
  const selectors = [
    'a[aria-label*="下一页"],button[aria-label*="下一页"],[role="button"][aria-label*="下一页"]',
    'a[title*="下一页"],button[title*="下一页"],[role="button"][title*="下一页"]',
    'a[aria-label*="next" i],button[aria-label*="next" i],[role="button"][aria-label*="next" i]',
    'a[title*="next" i],button[title*="next" i],[role="button"][title*="next" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).last();
    if (await isUsablePaginationControl(locator)) return locator;
  }

  for (const locator of [
    page.getByText(/^(下一页|下页|Next|next)$/).last(),
    page.getByText(/^(>|»|›)$/).last(),
  ]) {
    if (await isUsablePaginationControl(locator)) return locator;
  }

  // Strategy 2: common page controls expose an explicit next-page data attribute.
  const nextPageSelectors = [
    '[data-page="' + nextPageNumber + '"]',
    '[data-pagenum="' + nextPageNumber + '"]',
    '[data-page-number="' + nextPageNumber + '"]',
    '[data-pageindex="' + nextPageNumber + '"]',
    '[data-index="' + (nextPageNumber - 1) + '"]',
  ];

  for (const selector of nextPageSelectors) {
    const locator = page.locator(selector).last();
    if (await isUsablePaginationControl(locator)) return locator;
  }

  // Strategy 3: click the visible numeric button/link for the next page.
  const nextNumber = page
    .locator('a,button,[role="button"]')
    .filter({ hasText: new RegExp("^\\\\s*" + String(nextPageNumber) + "\\\\s*$") })
    .last();

  if (await isUsablePaginationControl(nextNumber)) return nextNumber;

  // Strategy 4: inspect visible pagination-ish elements and match either an
  // explicit page number or a next-page label. This is intentionally based on
  // the live DOM rather than a single brittle CSS class.
  const candidate = page.locator(
    'a[class*="page"],button[class*="page"],[role="button"][class*="page"],' +
      'a[class*="pagination"],button[class*="pagination"],[role="button"][class*="pagination"],' +
      'a[class*="pager"],button[class*="pager"],[role="button"][class*="pager"]',
  ).filter({ hasText: new RegExp(
    "^(?:" + String(nextPageNumber) + "|下一页|下页|Next|next|>|»|›)$",
  ) }).last();

  if (await isUsablePaginationControl(candidate)) return candidate;

  return null;
}

async function hasVerification(page: Page) {
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  const haystack = `${await page.title()}\n${text.slice(0, 10000)}\n${page.url()}`;

  return VERIFY_PATTERNS.some((pattern) => pattern.test(haystack)) ||
    (LOGIN_PATTERNS.some((pattern) => pattern.test(haystack)) &&
      !/职位|招聘|薪资|公司/.test(text));
}

export class FiftyOneJobSourceAdapter {
  readonly source = FIFTYONEJOB_SOURCE;

  async discover(input: unknown = {}): Promise<FetchResult> {
    const options = input as FiftyOneJobDiscoverOptions;
    const searches = Array.isArray(options?.searches) ? options.searches : [];

    if (!searches.length) {
      return {
        status: "failed",
        sourceId: this.source.id,
        fetchedAt: new Date().toISOString(),
        jobs: [],
        message: "No 51Job search tasks were supplied.",
      };
    }

    const targetCount = Math.max(1, Math.min(500, Math.floor(options.targetCount ?? 100)));
    // Internal safety valve. The user controls targetCount instead.
    const maxPagesPerSearch = Math.max(
      1,
      Math.min(50, Math.floor(options.maxPagesPerSearch ?? 50)),
    );
    const delayMs = Math.max(1000, options.delayMs ?? 1500);
    const detailDelayMs = Math.max(1000, options.detailDelayMs ?? delayMs);
    const fetchedAt = new Date().toISOString();
    const rawJobs: RawJob[] = [];
    const searchReports: string[] = [];
    const detailReports: string[] = [];
    const knownIds = new Set<string>();
    const knownUrls = new Set<string>();
    let browser: Browser | undefined;
    let detailPage: Page | undefined;
    let stopAll = false;

    const uniqueCount = () => deduplicateJobs([], rawJobs).uniqueJobs.length;

    const enrichPageJobs = async (pageJobs: RawJob[], taskLabel: string) => {
      for (const job of pageJobs) {
        if (stopAll || uniqueCount() >= targetCount) {
          stopAll = true;
          break;
        }

        const idKey = job.externalId ? String(job.externalId) : "";
        const urlKey = job.sourceUrl ? job.sourceUrl.split("?")[0] : "";
        if ((idKey && knownIds.has(idKey)) || (urlKey && knownUrls.has(urlKey))) continue;

        if (idKey) knownIds.add(idKey);
        if (urlKey) knownUrls.add(urlKey);

        let enriched = job;
        if (detailPage && job.sourceUrl) {
          const detail = await fetch51JobDetail(detailPage, job.sourceUrl);
          const detailFetchedAt = new Date().toISOString();
          const detailMetadata: Record<string, string | number | boolean | null> = {
            ...(job.metadata ?? {}),
            detailStatus: detail.status,
            detailFetchedAt,
          };

          if (detail.postedAt) detailMetadata.detailPostedAt = detail.postedAt;

          if (detail.status === "full" && detail.description) {
            enriched = {
              ...job,
              rawTitle: detail.title?.trim() || job.rawTitle,
              rawDescription: detail.description,
              ...(detail.company ? { companyName: detail.company } : {}),
              ...(detail.location ? { locationText: detail.location } : {}),
              metadata: detailMetadata,
            };
          } else {
            enriched = { ...job, metadata: detailMetadata };
          }

          detailReports.push(
            taskLabel + " " + (job.externalId ?? job.rawTitle) + ": detail " + detail.status,
          );

          if (detail.status === "blocked") {
            detailPage = undefined;
            detailReports.push("Detail fetching stopped after verification was detected.");
          }

          if (detailPage) {
            await new Promise((resolve) => setTimeout(resolve, detailDelayMs));
          }
        }

        rawJobs.push(enriched);
        if (uniqueCount() >= targetCount) {
          stopAll = true;
          break;
        }
      }
    };

    try {
      browser = await chromium.launch({ headless: options.headless ?? true });
      detailPage = await browser.newPage({
        locale: "zh-CN",
        viewport: { width: 1440, height: 1000 },
      });

      for (const task of searches) {
        if (stopAll) break;

        const keyword = task.keyword.trim();
        if (!keyword) continue;

        const maxPages = Math.max(
          1,
          Math.min(maxPagesPerSearch, task.maxPages ?? maxPagesPerSearch),
        );

        const page = await browser.newPage({
          locale: "zh-CN",
          viewport: { width: 1440, height: 1000 },
        });
        const capturedApi = await captureSearchApiItems(page);

        try {
          await page.goto(build51JobSearchUrl(keyword, task.jobArea), {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
          const firstApiUrl = capturedApi.requestUrls.find((requestUrl) => {
            return discoverPageParam(requestUrl)?.initialValue === 1;
          });

          let currentPageSignature = "";
          if (await hasVerification(page)) {
            searchReports.push(
              keyword + "/" + (task.jobArea ?? "all") +
                " page 1: verification detected; stopped without bypassing",
            );
          } else {
            const cards = await extractMainSearchCards(page);
            currentPageSignature = cards.map((card) => card.jobId).filter(Boolean).join(",");

            const pageFetchedAt = new Date().toISOString();
            const pageJobs = cards
              .map((card) =>
                searchCardToRawJob(card, task, 1, capturedApi.hrefByJobId, pageFetchedAt),
              )
              .filter((job): job is RawJob => Boolean(job));

            searchReports.push(
              keyword + "/" + (task.jobArea ?? "all") +
                " page 1: " + pageJobs.length + "/" + cards.length + " cards discovered",
            );
            await enrichPageJobs(pageJobs, keyword + "/" + (task.jobArea ?? "all") + " page 1");

            if (!stopAll && maxPages > 1 && firstApiUrl) {
              let previousSignature = currentPageSignature;

              for (let nextPageNumber = 2; nextPageNumber <= maxPages; nextPageNumber += 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));

                const apiPage = await fetchSearchApiPage(page, firstApiUrl, nextPageNumber);
                if (!apiPage?.payload?.items?.length) {
                  searchReports.push(
                    keyword + "/" + (task.jobArea ?? "all") +
                      " page " + nextPageNumber + ": API returned no items; stopped",
                  );
                  break;
                }

                const apiCards = apiPage.payload.items
                  .map((item: Record<string, unknown>) => searchApiItemToCard(item))
                  .filter((card): card is SearchCard => Boolean(card));
                const apiSignature = apiCards.map((card) => card.jobId).filter(Boolean).join(",");

                if (!apiSignature || apiSignature === previousSignature) {
                  searchReports.push(
                    keyword + "/" + (task.jobArea ?? "all") +
                      " page " + nextPageNumber + ": repeated/empty result set; stopped",
                  );
                  break;
                }
                previousSignature = apiSignature;

                for (const item of apiPage.payload.items as Record<string, unknown>[]) {
                  if (item.jobId && item.jobHref) {
                    capturedApi.hrefByJobId.set(String(item.jobId), String(item.jobHref));
                  }
                }

                const apiFetchedAt = new Date().toISOString();
                const apiJobs = apiCards
                  .map((card) =>
                    searchCardToRawJob(
                      card,
                      task,
                      nextPageNumber,
                      capturedApi.hrefByJobId,
                      apiFetchedAt,
                    ),
                  )
                  .filter((job): job is RawJob => Boolean(job));

                searchReports.push(
                  keyword + "/" + (task.jobArea ?? "all") +
                    " page " + nextPageNumber + ": " +
                    apiJobs.length + "/" + apiCards.length + " cards discovered via search API",
                );
                await enrichPageJobs(
                  apiJobs,
                  keyword + "/" + (task.jobArea ?? "all") + " page " + nextPageNumber,
                );
                if (stopAll) break;
              }
            } else if (!stopAll) {
              let pageNumber = 1;
              let previousSignature = currentPageSignature;

              while (pageNumber < maxPages && !stopAll) {
                const nextPageNumber = pageNumber + 1;
                const next = await findNextPageControl(page, nextPageNumber);
                if (!next) {
                  searchReports.push(
                    keyword + "/" + (task.jobArea ?? "all") +
                      " page " + pageNumber +
                      ": no usable API page parameter or enabled next-page control; stopped",
                  );
                  break;
                }

                const responsePromise = page
                  .waitForResponse(
                    (response) => isSearchApiResponse(response.url()),
                    { timeout: 10000 },
                  )
                  .catch(() => null);
                await next.click({ timeout: 10000 }).catch(() => null);
                await responsePromise;
                await page.waitForTimeout(delayMs);

                if (await hasVerification(page)) {
                  searchReports.push(
                    keyword + "/" + (task.jobArea ?? "all") +
                      " page " + nextPageNumber +
                      ": verification detected; stopped without bypassing",
                  );
                  break;
                }

                const nextCards = await extractMainSearchCards(page);
                const nextSignature = nextCards.map((card) => card.jobId).filter(Boolean).join(",");
                if (!nextSignature || nextSignature === previousSignature) {
                  searchReports.push(
                    keyword + "/" + (task.jobArea ?? "all") +
                      " page " + nextPageNumber +
                      ": next-page click did not produce a new result set; stopped",
                  );
                  break;
                }
                previousSignature = nextSignature;

                const nextFetchedAt = new Date().toISOString();
                const nextJobs = nextCards
                  .map((card) =>
                    searchCardToRawJob(
                      card,
                      task,
                      nextPageNumber,
                      capturedApi.hrefByJobId,
                      nextFetchedAt,
                    ),
                  )
                  .filter((job): job is RawJob => Boolean(job));

                searchReports.push(
                  keyword + "/" + (task.jobArea ?? "all") +
                    " page " + nextPageNumber + ": " +
                    nextJobs.length + "/" + nextCards.length + " cards discovered",
                );
                await enrichPageJobs(
                  nextJobs,
                  keyword + "/" + (task.jobArea ?? "all") + " page " + nextPageNumber,
                );
                pageNumber = nextPageNumber;
              }
            }
          }
        } finally {
          capturedApi.stop();
          await page.close();
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const deduped = deduplicateJobs([], rawJobs);
      const targetMessage =
        deduped.uniqueJobs.length >= targetCount
          ? "target " + targetCount + " reached"
          : "target " + targetCount +
            " not reached; source returned " + deduped.uniqueJobs.length + " unique job(s)";

      return {
        status: deduped.uniqueJobs.length ? "success" : "partial",
        fetchedAt,
        sourceId: this.source.id,
        jobs: deduped.uniqueJobs,
        message: [
          "51Job discovery: " + deduped.uniqueJobs.length +
            " unique RawJob(s), " + deduped.duplicates.length +
            " duplicate(s) removed; " + targetMessage + ".",
          ...searchReports,
          ...detailReports,
        ].join("\n"),
      };
    } catch (error) {
      const deduped = deduplicateJobs([], rawJobs);
      return {
        status: deduped.uniqueJobs.length ? "partial" : "failed",
        fetchedAt,
        sourceId: this.source.id,
        jobs: deduped.uniqueJobs,
        message:
          error instanceof Error
            ? "51Job adapter failed after " +
              deduped.uniqueJobs.length + " unique job(s): " + error.message
            : "51Job adapter failed.",
      };
    } finally {
      await detailPage?.close().catch(() => {});
      await browser?.close();
    }
  }

export function createFiftyOneJobSourceAdapter() {
  return new FiftyOneJobSourceAdapter();
}
