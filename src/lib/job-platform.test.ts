import { detectJobPlatform, normalizeJobUrlInput } from "./job-platform";

const cases = [
  ["https://www.zhipin.com/job_detail/abc.html", "boss"],
  ["m.51job.com/job/123.html", "51job"],
  ["https://jobs.zhaopin.com/123.htm", "zhaopin"],
  ["https://www.liepin.com/job/123456.shtml", "liepin"],
  ["https://www.lagou.com/jobs/123.html", "lagou"],
] as const;

for (const [url, expected] of cases) {
  const actual = detectJobPlatform(url);
  if (actual?.id !== expected) throw new Error(`Expected ${url} to identify as ${expected}, got ${actual?.id ?? "unknown"}`);
}

const copied = normalizeJobUrlInput("岗位链接：https://www.zhipin.com/job_detail/abc.html。");
if (copied.platform?.id !== "boss" || copied.url.hostname !== "www.zhipin.com") {
  throw new Error("Copied link text was not normalized and identified.");
}
if (detectJobPlatform("https://example.com/jobs/123") !== null) {
  throw new Error("Generic websites must not be misidentified as a recruitment platform.");
}
if (detectJobPlatform("not a URL") !== null) {
  throw new Error("Invalid input must not be identified as a platform.");
}

console.log("Job platform URL recognition acceptance passed");
