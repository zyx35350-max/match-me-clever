import { parseUserJobText } from "./user-job-import";
import { deduplicateJobs } from "./job-dedup";

const input = {
  text: `AI Content Specialist
Company: Example Studio
Location: Remote
Responsibilities:
- Create AI-generated visual content
- Work with Photoshop and generative AI tools
Requirements:
- Fluent English required
- Experience with AI image tools`,
  sourceUrl: "https://example.com/jobs/123",
};

const first = parseUserJobText(input);
const second = parseUserJobText(input);

if (first.raw.sourceId !== "user-import") throw new Error("wrong source");
if (first.raw.rawDescription !== input.text) throw new Error("original text not preserved");
if (first.job.title !== "AI Content Specialist") throw new Error("title not parsed");
if (first.job.company !== "Example Studio") throw new Error("company not parsed");
if (first.job.location !== "Remote") throw new Error("location not parsed");
if (!first.warnings.includes("salary was not supplied")) throw new Error("missing salary warning absent");
if (!first.warnings.includes("seniority was not supplied")) throw new Error("missing seniority warning absent");

const compact = parseUserJobText({
  text: `外贸业务销售
惠州-惠阳区1年及以上中技/中专英语读写熟练招1人
惠州市燚凯橡胶科技有限公司
5.5千-1.1万
岗位职责：
负责开发海外客户、邮件沟通与市场分析。`,
});
if (compact.job.company !== "惠州市燚凯橡胶科技有限公司") throw new Error("compact company not parsed");
if (compact.job.location !== "惠州-惠阳区") throw new Error("compact location not parsed");
if (compact.job.salaryMin !== 5500 || compact.job.salaryMax !== 11000) throw new Error("compact salary not parsed");
if (!compact.understanding.semantic.experienceRequirements?.some((item) => item.includes("1年及以上"))) {
  throw new Error("compact experience not parsed");
}
if (compact.understanding.semantic.englishProficiency !== "proficient_reading_writing") {
  throw new Error("English reading/writing proficiency not parsed");
}

const deduped = deduplicateJobs([first.raw], [second.raw]);
if (deduped.uniqueJobs.length !== 1) throw new Error("duplicate import was not removed");
if (deduped.duplicates.length !== 1) throw new Error("duplicate record was not reported");
const duplicate = deduped.duplicates[0];
if (!duplicate) throw new Error("duplicate record details missing");
if (duplicate.matchType !== "source_url") throw new Error("duplicate match type was not source_url");

const missingMetadata = parseUserJobText({
  text: `Product Designer
Responsibilities:
- Design product experiences`,
});
if (!missingMetadata.warnings.includes("companyName is missing")) throw new Error("missing company warning absent");
if (!missingMetadata.warnings.includes("locationText is missing")) throw new Error("missing location warning absent");
if (!missingMetadata.warnings.includes("salary was not supplied")) throw new Error("missing salary warning absent");

console.log("V1.2.4 user import acceptance passed");
