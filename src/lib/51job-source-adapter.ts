/**
 * 51Job source adapter — V1
 *
 * Server/Node-only discovery adapter.
 *
 * Responsibilities:
 * - Search 51Job with multiple keyword + jobArea combinations.
 * - Paginate by using the page's own "下一页" control; no guessed page parameter.
 * - Read title/company/location/salary/jobId/jobHref from the main search result list.
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
  maxPagesPerSearch?: number;
  delayMs?: number;
  headless?: boolean;
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

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
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
    rawDescription: cleanText(card.rawText),
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

async function captureSearchApiItems(
  page: Page,
  hrefByJobId: Map<string, string>,
) {
  const handler = async (response: import("playwright").Response) => {
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
      // The DOM card is still used for the structured fields. A malformed
      // auxiliary response must not crash the entire discovery run.
    }
  };

  page.on("response", handler);
  return () => page.off("response", handler);
}

async function extractMainSearchCards(page: Page): Promise<SearchCard[]> {
  return page.evaluate(() => {
    const text = (el: Element | null) =>
      (el?.textContent ?? "").replace(/\s+/g, " ").trim() || null;

    return [...document.querySelectorAll(".joblist .joblist-item")]
      .map((item) => {
        const job = item.querySelector(".joblist-item-job[sensorsdata]");
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(job?.getAttribute("sensorsdata") ?? "{}");
        } catch {}

        return {
          pageCode: typeof meta.pageCode === "string" ? meta.pageCode : null,
          jobId: meta.jobId ? String(meta.jobId) : null,
          title:
            item.querySelector(".jname")?.getAttribute("title")?.trim() ||
            text(item.querySelector(".jname")),
          company:
            item.querySelector(".cname")?.getAttribute("title")?.trim() ||
            text(item.querySelector(".cname")),
          salary: text(item.querySelector(".sal")),
          location:
            text(item.querySelector(".area .shrink-0")) ??
            text(item.querySelector(".area")),
          rawText: (item as HTMLElement).innerText?.trim() ?? "",
        };
      })
      .filter((card) => !card.pageCode || card.pageCode.endsWith("soulb"));
  });
}

async function findNextPageControl(page: Page) {
  const selectors = [
    'a[aria-label*="下一页"],button[aria-label*="下一页"]',
    'a[title*="下一页"],button[title*="下一页"]',
    'a[aria-label*="next" i],button[aria-label*="next" i]',
    'a[title*="next" i],button[title*="next" i]',
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;

    const disabled = await locator.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        (el as HTMLButtonElement).disabled === true ||
        el.getAttribute("aria-disabled") === "true" ||
        el.classList.contains("disabled")
      );
    });

    if (!disabled) return locator;
  }

  const textLocator = page.getByText(/^(下一页|下页|Next|next)$/).last();
  if ((await textLocator.count()) > 0) {
    const disabled = await textLocator.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.display === "none" ||
        style.visibility === "hidden" ||
        el.getAttribute("aria-disabled") === "true" ||
        el.classList.contains("disabled")
      );
    });
    if (!disabled) return textLocator;
  }

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

    const delayMs = Math.max(1000, options.delayMs ?? 1500);
    const defaultMaxPages = Math.max(1, options.maxPagesPerSearch ?? 1);
    const fetchedAt = new Date().toISOString();
    const rawJobs: RawJob[] = [];
    const searchReports: string[] = [];
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: options.headless ?? true });

      for (const task of searches) {
        const keyword = task.keyword.trim();
        if (!keyword) continue;

        const maxPages = Math.max(1, task.maxPages ?? defaultMaxPages);
        const page = await browser.newPage({
          locale: "zh-CN",
          viewport: { width: 1440, height: 1000 },
        });
        const hrefByJobId = new Map<string, string>();
        const stopCapturing = await captureSearchApiItems(page, hrefByJobId);

        try {
          let pageNumber = 1;
          let previousSignature = "";

          await page.goto(build51JobSearchUrl(keyword, task.jobArea), {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          while (pageNumber <= maxPages) {
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

            if (await hasVerification(page)) {
              searchReports.push(
                `${keyword}/${task.jobArea ?? "all"} page ${pageNumber}: verification detected; stopped without bypassing`,
              );
              break;
            }

            const cards = await extractMainSearchCards(page);
            const signature = cards.map((card) => card.jobId).filter(Boolean).join(",");
            if (signature && signature === previousSignature) {
              searchReports.push(
                `${keyword}/${task.jobArea ?? "all"} page ${pageNumber}: repeated result page; stopped`,
              );
              break;
            }
            previousSignature = signature;

            const pageFetchedAt = new Date().toISOString();
            const pageJobs = cards
              .map((card) =>
                searchCardToRawJob(card, task, pageNumber, hrefByJobId, pageFetchedAt),
              )
              .filter((job): job is RawJob => Boolean(job));

            rawJobs.push(...pageJobs);
            searchReports.push(
              `${keyword}/${task.jobArea ?? "all"} page ${pageNumber}: ${pageJobs.length}/${cards.length} cards converted`,
            );

            if (pageNumber >= maxPages) break;

            const next = await findNextPageControl(page);
            if (!next) {
              searchReports.push(
                `${keyword}/${task.jobArea ?? "all"} page ${pageNumber}: no enabled next-page control; stopped`,
              );
              break;
            }

            const beforeSignature = signature;
            const responsePromise = page
              .waitForResponse((response) => isSearchApiResponse(response.url()), {
                timeout: 10000,
              })
              .catch(() => null);

            await next.click({ timeout: 10000 }).catch(() => null);
            await responsePromise;
            await page.waitForTimeout(delayMs);

            const afterCards = await extractMainSearchCards(page);
            const afterSignature = afterCards.map((card) => card.jobId).filter(Boolean).join(",");

            if (!afterSignature || afterSignature === beforeSignature) {
              searchReports.push(
                `${keyword}/${task.jobArea ?? "all"} page ${pageNumber + 1}: next-page click did not produce a new result set; stopped`,
              );
              break;
            }

            pageNumber += 1;
          }
        } finally {
          stopCapturing();
          await page.close();
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const deduped = deduplicateJobs([], rawJobs);

      return {
        status: rawJobs.length ? "success" : "partial",
        fetchedAt,
        sourceId: this.source.id,
        jobs: deduped.uniqueJobs,
        message: [
          `51Job V1 discovery: ${deduped.uniqueJobs.length} unique RawJob(s), ${deduped.duplicates.length} duplicate(s) removed.`,
          ...searchReports,
        ].join("\n"),
      };
    } catch (error) {
      const deduped = deduplicateJobs([], rawJobs);
      return {
        status: rawJobs.length ? "partial" : "failed",
        fetchedAt,
        sourceId: this.source.id,
        jobs: deduped.uniqueJobs,
        message:
          error instanceof Error
            ? `51Job adapter failed: ${error.message}`
            : "51Job adapter failed.",
      };
    } finally {
      await browser?.close();
    }
  }
}

export function createFiftyOneJobSourceAdapter() {
  return new FiftyOneJobSourceAdapter();
}
