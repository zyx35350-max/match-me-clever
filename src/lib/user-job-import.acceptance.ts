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
if (!first.job.careerDirection) throw new Error("career direction was not extracted");
if (first.job.careerDirection !== "ai-content") throw new Error("unexpected career direction");
if (!first.warnings.includes("salary was not supplied")) throw new Error("missing salary warning absent");
if (!first.warnings.includes("seniority was not supplied")) throw new Error("missing seniority warning absent");

const deduped = deduplicateJobs([first.raw], [second.raw]);
if (deduped.uniqueJobs.length !== 1) throw new Error("duplicate import was not removed");
if (deduped.duplicates.length !== 1) throw new Error("duplicate record was not reported");
if (deduped.duplicates[0].matchType !== "source_url") throw new Error("duplicate match type was not source_url");

const missingMetadata = parseUserJobText({
  text: `Product Designer
Responsibilities:
- Design product experiences`,
});
if (!missingMetadata.warnings.includes("companyName is missing")) throw new Error("missing company warning absent");
if (!missingMetadata.warnings.includes("locationText is missing")) throw new Error("missing location warning absent");
if (!missingMetadata.warnings.includes("salary was not supplied")) throw new Error("missing salary warning absent");

console.log("V1.2.4 user import acceptance passed");
