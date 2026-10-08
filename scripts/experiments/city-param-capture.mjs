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
await page.waitForTimeout(5000);
console.log("TITLE:", await page.title());
console.log("REQUESTS_AFTER_LOAD:", JSON.stringify(reqs, null, 2));

// Try to open the city filter and select 深圳
try {
  const cityBtn = page.locator("text=城市").first();
  // dump candidate filter area text for inspection
  const body = await page.evaluate(() => document.body.innerText.slice(0, 1500));
  console.log("BODY_HEAD:", body);
} catch (e) { console.log("ERR", e.message); }

await page.screenshot({ path: "/tmp/browser/city-param/1_loaded.png" });
await browser.close();
