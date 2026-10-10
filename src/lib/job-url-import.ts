import { parseUserJobText, type UserJobImportResult } from "./user-job-import";
import { normalizeJobUrlInput, type JobPlatform } from "./job-platform";

export type JobUrlImportErrorCode =
  | "invalid_url"
  | "unsupported_protocol"
  | "not_found"
  | "blocked"
  | "rate_limited"
  | "unreadable_page"
  | "no_job_content"
  | "timeout"
  | "failed";

export class JobUrlImportError extends Error {
  constructor(
    message: string,
    readonly code: JobUrlImportErrorCode,
    readonly platform: JobPlatform | null = null,
    readonly httpStatus = 422,
  ) {
    super(message);
    this.name = "JobUrlImportError";
  }
}

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
        const types = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];
        if (!types.includes("JobPosting")) continue;
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
  platform: JobPlatform | null;
}

export async function fetchJobUrl(input: string): Promise<JobUrlFetchResult> {
  let normalized: ReturnType<typeof normalizeJobUrlInput>;
  try {
    normalized = normalizeJobUrlInput(input);
  } catch (error) {
    throw new JobUrlImportError(
      error instanceof Error ? error.message : "请输入有效的岗位链接。",
      "invalid_url",
    );
  }
  const { url, platform } = normalized;
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new JobUrlImportError("只支持 http:// 或 https:// 岗位链接。", "unsupported_protocol", platform);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; Solstice Job Importer/1.0)",
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      throw new JobUrlImportError("平台要求登录或拒绝了自动读取。请在平台正常查看职位后粘贴职位全文导入。", "blocked", platform, 403);
    }
    if (response.status === 404 || response.status === 410) {
      throw new JobUrlImportError("职位链接不存在或已经失效。", "not_found", platform, 404);
    }
    if (response.status === 429) {
      throw new JobUrlImportError("平台暂时限制了访问，请稍后再试或直接粘贴职位全文。", "rate_limited", platform, 429);
    }
    if (!response.ok) {
      throw new JobUrlImportError(`职位页面暂时无法读取（HTTP ${response.status}）。`, "failed", platform, 502);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new JobUrlImportError("链接可访问，但返回内容不是可读取的网页。", "unreadable_page", platform);
    }

    const html = await response.text();
    if (html.length > 3_000_000) {
      throw new JobUrlImportError("职位页面太大，暂时无法自动解析。", "unreadable_page", platform);
    }

    const structured = extractJobPostingJsonLd(html);
    const visible = htmlToText(html);
    const text = [structured, visible].filter(Boolean).join("\n\n").trim();
    const challengePage =
      /(?:captcha|access verification|security verification|verify you are human|登录后查看|请先登录|扫码登录|安全验证|访问验证|人机验证|滑块验证)/i.test(text) &&
      !structured;

    if (challengePage) {
      throw new JobUrlImportError("平台返回了登录或访问验证页面，链接已识别但职位内容不可读取。请粘贴职位全文导入。", "blocked", platform, 403);
    }
    if (text.length < 80) {
      throw new JobUrlImportError("链接已识别，但页面没有提取到足够的职位内容。页面可能需要登录、动态加载或阻止自动读取；请粘贴职位全文导入。", "no_job_content", platform);
    }

    return { text: text.slice(0, 120_000), sourceUrl: url.toString(), platform };
  } catch (error) {
    if (error instanceof JobUrlImportError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new JobUrlImportError("读取职位链接超时，请稍后重试或直接粘贴职位全文。", "timeout", platform, 504);
    }
    throw new JobUrlImportError("链接已识别，但网页读取失败。请稍后重试或直接粘贴职位全文。", "failed", platform, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export async function importJobFromUrl(url: string): Promise<UserJobImportResult & { platform: JobPlatform | null }> {
  const fetched = await fetchJobUrl(url);
  return {
    ...parseUserJobText({ text: fetched.text, sourceUrl: fetched.sourceUrl }),
    platform: fetched.platform,
  };
}
