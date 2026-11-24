import { chromium, type Browser, type LaunchOptions, type Page } from "playwright";

/** Launch the local Playwright browser or the Chromium binary bundled for Vercel. */
export async function launchServerBrowser(options: LaunchOptions = {}): Promise<Browser> {
  if (process.env["VERCEL"] === "1") {
    const { default: serverlessChromium } = await import("@sparticuz/chromium");
    return chromium.launch({
      ...options,
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      headless: true,
    });
  }

  return chromium.launch(options);
}

/** Keep scrape pages lean by skipping assets that do not affect job text or API responses. */
export async function createServerBrowserPage(
  browser: Browser,
  options: Parameters<Browser["newPage"]>[0] = {},
): Promise<Page> {
  const page = await browser.newPage(options);
  await page.route("**/*", (route) => {
    const resourceType = route.request().resourceType();
    if (["font", "image", "media"].includes(resourceType)) return route.abort();
    return route.continue();
  });
  return page;
}
