import { parseUserJobText, type UserJobImportResult } from "./user-job-import";

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function htmlToText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<br\s*\/?>(?=.)/gi, "\n")
      .replace(/<\/(?:p|div|section|article|li|tr|h[1-6]|header|footer)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<[^>]+>/g, " ")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n"),
  );
}

function extractJobPostingJsonLd(html: string) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const chunks: string[] = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]!.trim());
      const candidates = Array.isArray(parsed) ? parsed : parsed["@graph"] ?? [parsed];
      for (const item of candidates) {
        if (!item || item["@type"] !== "JobPosting") continue;
        const parts = [
          item.title,
          item.description,
          item.hiringOrganization?.name,
          item.jobLocation?.address?.addressLocality,
          item.jobLocation?.address?.addressRegion,
          item.baseSalary?.value?.minValue,
          item.baseSalary?.value?.maxValue,
          item.baseSalary?.currency,
          item.employmentType,
          ...(Array.isArray(item.qualifications) ? item.qualifications : [item.qualifications]),
          ...(Array.isArray(item.skills) ? item.skills : [item.skills]),
        ].filter(Boolean);
        chunks.push(parts.join("\n"));
      }
    } catch {
      // Ignore malformed JSON-LD and keep the visible page text.
    }
  }

  return chunks.join("\n");
}

export interface JobUrlFetchResult {
  text: string;
  sourceUrl: string;
}

export async function fetchJobUrl(url: string): Promise<JobUrlFetchResult> {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("请输入有效的岗位链接。");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("只支持 http:// 或 https:// 岗位链接。");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(parsed.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; Solstice Job Importer/1.0)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`岗位页面返回 HTTP ${response.status}。`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("这个链接不是可读取的网页。");
    }

    const html = await response.text();
    if (html.length > 3_000_000) throw new Error("岗位页面太大，暂时无法自动解析。");

    const structured = extractJobPostingJsonLd(html);
    const visible = htmlToText(html);
    const text = [structured, visible].filter(Boolean).join("\n\n").trim();

    if (text.length < 80) {
      throw new Error("页面没有提取到足够的岗位文本。这个网站可能需要登录、动态加载或阻止自动读取。");
    }

    return { text: text.slice(0, 120_000), sourceUrl: parsed.toString() };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("读取岗位链接超时，请稍后重试或直接粘贴岗位文本。");
    }
    throw error instanceof Error ? error : new Error("无法读取这个岗位链接。");
  } finally {
    clearTimeout(timeout);
  }
}

export async function importJobFromUrl(url: string): Promise<UserJobImportResult> {
  const fetched = await fetchJobUrl(url);
  return parseUserJobText({
    text: fetched.text,
    sourceUrl: fetched.sourceUrl,
  });
}
