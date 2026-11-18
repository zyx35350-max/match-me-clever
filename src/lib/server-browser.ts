import { chromium, type Browser, type LaunchOptions } from "playwright";

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
