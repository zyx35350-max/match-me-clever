import { chromium } from "playwright";

const URL = "https://we.51job.com/pc/search?keyword=AI%E4%BA%A7%E5%93%81%E5%8A%A9%E7%90%86";
const reqs = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1800 },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  locale: "zh-CN",
});
const page = await ctx.newPage();
page.on("request", (r) => {
  if (r.url().includes("/api/job/search-pc")) {
    reqs.push({ method: r.method(), url: r.url(), postData: r.postData() });
  }
});

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
reqs.length = 0;

// Click 深圳 in the city filter
await page.locator("text=深圳").first().click();
await page.waitForTimeout(5000);

console.log("TITLE:", await page.title());
console.log("PAGE_URL:", page.url());
console.log("REQUESTS_AFTER_SHENZHEN:", JSON.stringify(reqs, null, 2));
await page.screenshot({ path: "/tmp/browser/city-param/2_shenzhen.png" });
await browser.close();
