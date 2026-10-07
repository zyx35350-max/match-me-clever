// DEV-ONLY experiment: inspect 51Job search-result cards with Playwright.
// Not part of the app bundle, not a registered job source, and never writes RawJob.
// Never bypasses CAPTCHA/login/verification.
//
// Usage:
//   node scripts/experiments/51job-search-probe.mjs "https://we.51job.com/pc/search?keyword=AI%E4%BA%A7%E5%93%81%E5%8A%A9%E7%90%86"

import { chromium } from "playwright";

const VERIFY_PATTERNS = [
  /验证码|滑块|拖动|安全验证|人机验证|访问验证|verify|captcha|geetest|nc_|slider/i,
];
const BLOCK_PATTERNS = [
  /访问受限|访问过于频繁|禁止访问|403 Forbidden|Access Denied|请求被拒绝/i,
];
const LOGIN_PATTERNS = [/请登录|登录后查看|扫码登录/];

const SEARCH_URL =
  "https://we.51job.com/pc/search?keyword=AI%E4%BA%A7%E5%93%81%E5%8A%A9%E7%90%86";

function cleanText(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(href, baseUrl) {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractJobId(url) {
  if (!url) return null;

  // Common 51Job detail pattern: /<city>/<numeric-job-id>.html
  const match = url.match(/\/(\d{5,})\.html(?:[?#]|$)/i);
  return match?.[1] ?? null;
}

function looksLikeJobUrl(url) {
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

function looksLikeSalary(text) {
  return /(?:\d+(?:\.\d+)?(?:-|~|—|至)\d+(?:\.\d+)?)\s*(?:千|k|K|万)(?:\b|$)|面议|\d+薪/i.test(
    text,
  );
}

function looksLikeLocation(text) {
  return /(?:北京|上海|广州|深圳|杭州|成都|重庆|武汉|南京|苏州|西安|厦门|天津|东莞|佛山|宁波|无锡|合肥|郑州|青岛|长沙|福州|惠州|珠海|中山|昆明|济南|沈阳|大连|石家庄|南昌|南宁|哈尔滨|长春|贵阳|太原|乌鲁木齐|海口|兰州|香港|澳门|广东|浙江|江苏|福建|山东|四川|湖北|湖南|河北|河南|安徽|陕西|辽宁|吉林|云南|江西|广西|海南|新疆|内蒙古|西藏|宁夏|甘肃|全国)/.test(
    text,
  );
}

function extractCompanyFromText(text, title) {
  const lines = text
    .split(/\n|\r/)
    .map((line) => cleanText(line))
    .filter(Boolean)
    .filter((line) => line !== title);

  const blocked = /^(五险一金|周末双休|双休|做五休二|\d+年经验|经验不限|\d+人|大专|本科|硕士|职位描述|职位信息|上海|北京|广州|深圳)$/i;

  // Prefer lines that look like company names and are not obvious tags/metadata.
  const candidate = lines.find(
    (line) =>
      line.length >= 2 &&
      line.length <= 80 &&
      !blocked.test(line) &&
      !looksLikeSalary(line) &&
      !looksLikeLocation(line) &&
      !/^https?:\/\//i.test(line),
  );

  return candidate ?? null;
}

async function inspectCard(card, baseUrl) {
  return card.evaluate(
    (node, context) => {
      const text = (node.innerText ?? "").replace(/\s+/g, " ").trim();
      const links = [...node.querySelectorAll("a[href]")].map((a) => ({
        href: a.getAttribute("href"),
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      }));

      const heading =
        node.querySelector("h1,h2,h3,h4,h5,h6")?.textContent ??
        node.querySelector('[class*="job"], [class*="title"]')?.textContent ??
        "";

      return {
        text,
        links,
        heading: heading.replace(/\s+/g, " ").trim(),
        tagName: node.tagName,
        className: typeof node.className === "string" ? node.className : "",
        ...context,
      };
    },
    { baseUrl },
  );
}

async function findCards(page) {
  // First identify actual 51Job detail links. This avoids depending on one
  // brittle CSS class name that may change with the site UI.
  const linkData = await page.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((a) => ({
      href: a.href,
      text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
    })),
  );

  const jobLinks = linkData.filter((item) => looksLikeJobUrl(item.href));

  const seen = new Set();
  const cards = [];

  for (const item of jobLinks) {
    const locator = page.locator('a[href="' + item.href.replace(/"/g, '\\"') + '"]').first();
    let card = locator;

    // Walk upward and choose the smallest ancestor that contains enough
    // visible job-card text while avoiding the entire page/list container.
    for (let level = 0; level < 6; level += 1) {
      const parent = card.locator("..");
      if ((await parent.count()) === 0) break;

      const candidateText = cleanText(await parent.innerText().catch(() => ""));
      const childLinks = await parent.locator("a[href]").count().catch(() => 0);

      if (
        candidateText.length >= 40 &&
        candidateText.length <= 1800 &&
        childLinks <= 12
      ) {
        card = parent;
      } else {
        break;
      }
    }

    const handle = await card.elementHandle();
    if (!handle) continue;

    const key = item.href;
    if (seen.has(key)) continue;
    seen.add(key);

    cards.push({ handle, href: item.href });
  }

  return cards;
}

export async function probeSearch(url = SEARCH_URL) {
  const result = {
    status: "failed",
    source: "51job",
    keyword: "AI产品助理",
    searchUrl: url,
    finalUrl: "",
    httpStatus: 0,
    title: "",
    totalJobLinksDetected: 0,
    totalCardsDetected: 0,
    jobs: [],
    fieldStats: {
      title: { success: 0, total: 0 },
      company: { success: 0, total: 0 },
      location: { success: 0, total: 0 },
      salary: { success: 0, total: 0 },
      url: { success: 0, total: 0 },
      jobId: { success: 0, total: 0 },
    },
    duplicateUrls: [],
    textPreview: "",
    message: "",
  };

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    result.message = "Playwright launch failed: " + (error?.message ?? error);
    return result;
  }

  try {
    const page = await browser.newPage({
      locale: "zh-CN",
      viewport: { width: 1440, height: 1000 },
    });

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

    result.finalUrl = page.url();
    result.httpStatus = response?.status() ?? 0;
    result.title = await page.title();

    const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
    result.textPreview = bodyText.slice(0, 2500);

    const haystack =
      result.title + "\n" + bodyText.slice(0, 8000) + "\n" + result.finalUrl;

    if (VERIFY_PATTERNS.some((pattern) => pattern.test(haystack))) {
      result.status = "verification_required";
      result.message = "Verification page detected. Not bypassed.";
      return result;
    }

    if (
      result.httpStatus === 403 ||
      result.httpStatus === 429 ||
      BLOCK_PATTERNS.some((pattern) => pattern.test(haystack))
    ) {
      result.status = "blocked";
      result.message = `Access blocked (HTTP ${result.httpStatus}).`;
      return result;
    }

    if (
      LOGIN_PATTERNS.some((pattern) => pattern.test(haystack)) &&
      !/职位|招聘|薪资|公司/.test(bodyText)
    ) {
      result.status = "verification_required";
      result.message = "Login required. Not bypassed.";
      return result;
    }

    const linkData = await page.locator("a[href]").evaluateAll((anchors) =>
      anchors.map((a) => ({
        href: a.href,
        text: (a.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    );

    const jobLinks = linkData.filter((item) => looksLikeJobUrl(item.href));
    result.totalJobLinksDetected = jobLinks.length;

    const uniqueUrls = [...new Set(jobLinks.map((item) => item.href))];

    // Main search-result list only: `.joblist .joblist-item` cards whose
    // sensorsdata pageCode is the search list ("sou|sou|soulb"). Recommendation
    // modules live outside `.joblist` and are ignored.
    const mainCards = await page.evaluate(() => {
      const t = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim() || null;
      return [...document.querySelectorAll(".joblist .joblist-item")].map((item) => {
        const job = item.querySelector(".joblist-item-job[sensorsdata]");
        let meta = {};
        try { meta = JSON.parse(job?.getAttribute("sensorsdata") ?? "{}"); } catch {}
        const anchors = [...item.querySelectorAll("a[href]")].map((a) => a.href);
        return {
          pageCode: meta.pageCode ?? null,
          jobId: meta.jobId ?? null,
          title: item.querySelector(".jname")?.getAttribute("title")?.trim() || t(item.querySelector(".jname")),
          company: item.querySelector(".cname")?.getAttribute("title")?.trim() || t(item.querySelector(".cname")),
          salary: t(item.querySelector(".sal")),
          location: t(item.querySelector(".area .shrink-0")) ?? t(item.querySelector(".area")),
          anchors,
          rawText: (item.innerText ?? "").trim(),
        };
      });
    });

    const searchCards = mainCards.filter((c) => !c.pageCode || c.pageCode.endsWith("soulb"));
    result.totalCardsDetected = searchCards.length;

    const jobs = searchCards.map((c) => {
      const jobId = c.jobId && /^\d+$/.test(c.jobId) ? c.jobId : null;
      // URL only from a real link in this card that carries this card's jobId.
      const url =
        (jobId && c.anchors.find((h) => looksLikeJobUrl(h) && extractJobId(h) === jobId)) || null;
      return {
        title: c.title,
        company: c.company,
        location: c.location,
        salary: c.salary, // from the card's dedicated .sal element only
        jobId,
        url,
        rawText: c.rawText.slice(0, 1500),
      };
    });

    // Deduplicate by URL first, then by jobId when available.
    const deduped = [];
    const seenIds = new Set();
    const seenJobUrls = new Set();

    for (const job of jobs) {
      const key = job.jobId ? `id:${job.jobId}` : `url:${job.url}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      seenJobUrls.add(job.url);
      deduped.push(job);
    }

    result.jobs = deduped;

    const total = result.jobs.length;
    for (const job of result.jobs) {
      for (const field of ["title", "company", "location", "salary", "url", "jobId"]) {
        result.fieldStats[field].total = total;
        if (job[field]) result.fieldStats[field].success += 1;
      }
    }

    result.duplicateUrls = uniqueUrls.filter(
      (item, index, all) => all.indexOf(item) !== index,
    );

    if (result.jobs.length > 0) {
      result.status = "success";
      result.message = `Search page readable and ${result.jobs.length} job card(s) extracted.`;
    } else if (result.totalJobLinksDetected > 0) {
      result.status = "partial";
      result.message =
        "51Job detail links were detected, but job cards could not be reliably structured.";
    } else if (bodyText.length > 300) {
      result.status = "partial";
      result.message =
        "Search page opened, but no 51Job job-detail links were detected.";
    } else {
      result.status = "partial";
      result.message = "Page opened but usable search-result content was not detected.";
    }
  } catch (error) {
    result.message = "Navigation or extraction failed: " + (error?.message ?? error);
  } finally {
    await browser.close();
  }

  return result;
}

const url = process.argv[2] || SEARCH_URL;

probeSearch(url).then((result) => {
  console.log(JSON.stringify(result, null, 2));
});
