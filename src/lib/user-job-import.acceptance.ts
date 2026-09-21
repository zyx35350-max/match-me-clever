import { parseUserJobText } from "./user-job-import";

const result = parseUserJobText({
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
});

if (result.raw.sourceId !== "user-import") throw new Error("wrong source");
if (result.job.title !== "AI Content Specialist") throw new Error("title not parsed");
if (result.job.company !== "Example Studio") throw new Error("company not parsed");
if (result.job.location !== "Remote") throw new Error("location not parsed");
if (!result.job.skills.length) throw new Error("semantic skills were not extracted");
if (result.job.summary !== result.raw.rawDescription) throw new Error("raw description was not preserved");
if (!result.warnings.includes("salary was not supplied")) throw new Error("missing-data warning absent");
console.log("V1.2.4 user import acceptance passed");
