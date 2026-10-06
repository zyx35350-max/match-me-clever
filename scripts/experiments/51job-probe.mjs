// DEV-ONLY experiment: open a single 51Job page with Playwright and report what is visible.
// Not part of the app bundle, not a registered job source. Never bypasses CAPTCHA/login/verification.
// Usage: node scripts/experiments/51job-probe.mjs <url>
import { chromium } from "playwright";

const VERIFY_PATTERNS = [
  /验证码|滑块|拖动|安全验证|人机验证|访问验证|verify|captcha|geetest|nc_|slider/i,
];
const BLOCK_PATTERNS = [/访问受限|访问过于频繁|禁止访问|403 Forbidden|Access Denied|请求被拒绝/i];
const LOGIN_PATTERNS = [/请登录|登录后查看|扫码登录/];
const JOB_PATTERNS = [/职位信息|岗位职责|任职要求|职位描述|工作地址|薪资|千|万/];

export async function probe(url) {
  const result = { status: "failed", title: "", textPreview: "", finalUrl: "", message: "" };
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    result.message = "Playwright launch failed: " + (e?.message ?? e);
    return result;
  }
  try {
    const page = await browser.newPage({ locale: "zh-CN" });
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    result.title = await page.title();
    const text = await page.evaluate(() => document.body?.innerText ?? "");
    result.textPreview = text.slice(0, 1500);
    result.finalUrl = page.url();
    const httpStatus = resp?.status() ?? 0;
    const hay = result.title + "\n" + text.slice(0, 5000) + "\n" + result.finalUrl;

    if (VERIFY_PATTERNS.some((p) => p.test(hay))) {
      result.status = "verification_required";
      result.message = `Verification page detected (HTTP ${httpStatus}). Not bypassed.`;
    } else if (httpStatus === 403 || httpStatus === 429 || BLOCK_PATTERNS.some((p) => p.test(hay))) {
      result.status = "blocked";
      result.message = `Access blocked (HTTP ${httpStatus}).`;
    } else if (LOGIN_PATTERNS.some((p) => p.test(hay)) && !JOB_PATTERNS.some((p) => p.test(hay))) {
      result.status = "verification_required";
      result.message = "Login required. Not bypassed.";
    } else if (JOB_PATTERNS.some((p) => p.test(text)) && text.length > 300) {
      result.status = "success";
      result.message = `Job content readable (HTTP ${httpStatus}).`;
    } else {
      result.status = "partial";
      result.message = `Page opened (HTTP ${httpStatus}) but job content not clearly found.`;
    }
  } catch (e) {
    result.message = "Navigation failed: " + (e?.message ?? e);
  } finally {
    await browser.close();
  }
  return result;
}

const url = process.argv[2];
if (url) probe(url).then((r) => console.log(JSON.stringify(r, null, 2)));
