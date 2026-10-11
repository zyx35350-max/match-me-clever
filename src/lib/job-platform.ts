export type JobPlatformId = "boss" | "51job" | "zhaopin" | "liepin" | "lagou";

export interface JobPlatform {
  id: JobPlatformId;
  name: string;
  domains: readonly string[];
}

export const JOB_PLATFORMS: readonly JobPlatform[] = [
  { id: "boss", name: "BOSS直聘", domains: ["zhipin.com", "bosszhipin.com"] },
  { id: "51job", name: "前程无忧（51Job）", domains: ["51job.com", "51job.com.cn"] },
  { id: "zhaopin", name: "智联招聘", domains: ["zhaopin.com"] },
  { id: "liepin", name: "猎聘", domains: ["liepin.com"] },
  { id: "lagou", name: "拉勾", domains: ["lagou.com"] },
] as const;

export interface NormalizedJobUrl {
  url: URL;
  platform: JobPlatform | null;
}

/** Extracts a URL from common copied link text and accepts bare platform domains. */
export function normalizeJobUrlInput(value: string): NormalizedJobUrl {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("请粘贴岗位链接。");

  const extracted =
    trimmed.match(/https?:\/\/[^\s<>"'，,]+/i)?.[0] ??
    trimmed.match(/(?:^|\s)((?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s<>"'，,]*)?)/i)?.[1] ??
    trimmed;
  const cleaned = extracted.replace(/[)\]}>.,，。！？;；]+$/g, "");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`);
  } catch {
    throw new Error("请输入有效的岗位链接。");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("只支持 http:// 或 https:// 岗位链接。");
  }
  if (!url.hostname || !url.hostname.includes(".")) {
    throw new Error("请输入有效的岗位链接。");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const platform =
    JOB_PLATFORMS.find((candidate) =>
      candidate.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)),
    ) ?? null;

  return { url, platform };
}

export function detectJobPlatform(value: string): JobPlatform | null {
  try {
    return normalizeJobUrlInput(value).platform;
  } catch {
    return null;
  }
}
