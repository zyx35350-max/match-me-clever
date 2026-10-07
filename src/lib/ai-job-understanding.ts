import { z } from "zod";

export const AI_JOB_UNDERSTANDING_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "object",
      properties: {
        value: { type: ["string", "null"] },
        evidence: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["value", "evidence", "confidence"],
    },
    company: {
      type: "object",
      properties: {
        value: { type: ["string", "null"] },
        evidence: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["value", "evidence", "confidence"],
    },
    location: {
      type: "object",
      properties: {
        value: { type: ["string", "null"] },
        evidence: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["value", "evidence", "confidence"],
    },
    salary: {
      type: "object",
      properties: {
        min: { type: ["number", "null"] },
        max: { type: ["number", "null"] },
        currency: { type: ["string", "null"] },
        period: { type: ["string", "null"] },
        evidence: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["min", "max", "currency", "period", "evidence", "confidence"],
    },
    experience: {
      type: "object",
      properties: {
        minYears: { type: ["number", "null"] },
        maxYears: { type: ["number", "null"] },
        relation: { type: "string", enum: ["range", "minimum", "exact", "unlimited", "unknown"] },
        evidence: { type: ["string", "null"] },
        confidence: { type: "number" },
      },
      required: ["minYears", "maxYears", "relation", "evidence", "confidence"],
    },
    education: {
      type: "object",
      properties: {
        requirements: { type: "array", items: { type: "string" } },
        evidence: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
      },
      required: ["requirements", "evidence", "confidence"],
    },
    workMode: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
    employmentType: { type: "string", enum: ["fulltime", "parttime", "unknown"] },
    jobRole: {
      type: "string",
      enum: [
        "international-sales",
        "marketing",
        "product",
        "content",
        "operations",
        "project-assistant",
        "design",
        "software-engineering",
        "customer-service",
        "unknown",
      ],
    },
    seniority: {
      type: "string",
      enum: ["junior", "mid", "senior", "lead", "director", "unknown"],
    },
    requiredSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "evidence", "confidence"],
      },
    },
    preferredSkills: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["name", "evidence", "confidence"],
      },
    },
    responsibilities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["text", "evidence", "confidence"],
      },
    },
    english: {
      type: "object",
      properties: {
        requirement: { type: "string", enum: ["required", "preferred", "unknown"] },
        proficiency: {
          type: "string",
          enum: [
            "CET-4",
            "CET-4+",
            "CET-6",
            "CET-6+",
            "proficient_reading_writing",
            "proficient_all",
            "fluent",
            "fluent_speaking",
            "working_proficiency",
            "unknown",
          ],
        },
        evidence: { type: "array", items: { type: "string" } },
      },
      required: ["requirement", "proficiency", "evidence"],
    },
    internationalSignals: {
      type: "object",
      properties: {
        overseasBusiness: { type: "boolean" },
        globalTeam: { type: "boolean" },
        englishUsage: { type: "boolean" },
        crossBorderCollaboration: { type: "boolean" },
      },
      required: ["overseasBusiness", "globalTeam", "englishUsage", "crossBorderCollaboration"],
    },
    aiRelevance: { type: "string", enum: ["explicit", "adjacent", "none", "unknown"] },
    careerDirections: {
      type: "array",
      items: {
        type: "string",
        enum: ["ai-ecommerce", "ai-product", "ai-content", "ai-visual", "ai-operations", "explore"],
      },
    },
    ambiguities: { type: "array", items: { type: "string" } },
  },
  required: [
    "title",
    "company",
    "location",
    "salary",
    "experience",
    "education",
    "workMode",
    "employmentType",
    "jobRole",
    "seniority",
    "requiredSkills",
    "preferredSkills",
    "responsibilities",
    "english",
    "internationalSignals",
    "aiRelevance",
    "careerDirections",
    "ambiguities",
  ],
} as const;

const evidenceField = z.object({
  value: z.string().nullable(),
  evidence: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const aiJobUnderstandingSchema = z.object({
  title: evidenceField,
  company: evidenceField,
  location: evidenceField,
  salary: z.object({
    min: z.number().nullable(),
    max: z.number().nullable(),
    currency: z.string().nullable(),
    period: z.string().nullable(),
    evidence: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  experience: z.object({
    minYears: z.number().nullable(),
    maxYears: z.number().nullable(),
    relation: z.enum(["range", "minimum", "exact", "unlimited", "unknown"]),
    evidence: z.string().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  education: z.object({
    requirements: z.array(z.string()),
    evidence: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
  workMode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
  employmentType: z.enum(["fulltime", "parttime", "unknown"]),
  jobRole: z.enum([
    "international-sales",
    "marketing",
    "product",
    "content",
    "operations",
    "project-assistant",
    "design",
    "software-engineering",
    "customer-service",
    "unknown",
  ]),
  seniority: z.enum(["junior", "mid", "senior", "lead", "director", "unknown"]),
  requiredSkills: z.array(z.object({ name: z.string(), evidence: z.string(), confidence: z.number() })),
  preferredSkills: z.array(z.object({ name: z.string(), evidence: z.string(), confidence: z.number() })),
  responsibilities: z.array(
    z.object({ text: z.string(), evidence: z.string(), confidence: z.number() }),
  ),
  english: z.object({
    requirement: z.enum(["required", "preferred", "unknown"]),
    proficiency: z.enum([
      "CET-4",
      "CET-4+",
      "CET-6",
      "CET-6+",
      "proficient_reading_writing",
      "proficient_all",
      "fluent",
      "fluent_speaking",
      "working_proficiency",
      "unknown",
    ]),
    evidence: z.array(z.string()),
  }),
  internationalSignals: z.object({
    overseasBusiness: z.boolean(),
    globalTeam: z.boolean(),
    englishUsage: z.boolean(),
    crossBorderCollaboration: z.boolean(),
  }),
  aiRelevance: z.enum(["explicit", "adjacent", "none", "unknown"]),
  careerDirections: z.array(
    z.enum(["ai-ecommerce", "ai-product", "ai-content", "ai-visual", "ai-operations", "explore"]),
  ),
  ambiguities: z.array(z.string()),
});

export type AIJobUnderstanding = z.infer<typeof aiJobUnderstandingSchema>;

export class AIProviderUnavailableError extends Error {}

function buildPrompt(text: string) {
  return [
    "You are the Job Understanding engine for Match Me Clever.",
    "Understand one real job listing. Do not score the candidate and do not recommend whether to apply.",
    "",
    "Rules:",
    "1. The supplied job text is the only source of truth.",
    "2. Never invent company, location, salary, experience, education, work mode, employment type, skill, responsibility or requirement.",
    "3. Missing or unresolved facts must be null or unknown.",
    "4. Every extracted scalar fact must include exact evidence copied from the source when evidence exists.",
    "5. Never use line position as semantic meaning. Recruitment sites reorder fields.",
    "6. Preserve ranges: '1-3年' means minYears=1, maxYears=3, relation=range.",
    "7. '3年以上' means minYears=3, maxYears=null, relation=minimum.",
    "8. '经验不限' or '无需经验' means relation=unlimited.",
    "9. Separate required skills from preferred skills.",
    "10. Job role describes what the position actually does.",
    "11. Career direction must use only the existing Match Me Clever taxonomy.",
    "12. AI relevance is based on the job text, not company name.",
    "",
    "SOURCE JOB TEXT:",
    text,
  ].join("\\n");
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("Gemini returned an invalid response.");
  const candidates = (
    payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  ).candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned no structured job understanding.");
  return text;
}

export function isGeminiConfigured() {
  return Boolean(process.env["GEMINI_API_KEY"]);
}

export async function understandJobWithGemini(text: string): Promise<AIJobUnderstanding> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new AIProviderUnavailableError("GEMINI_API_KEY is not configured.");

  const model = process.env["GEMINI_MODEL"]?.trim() || "gemini-3.8-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) +
        ":generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(text.slice(0, 120_000)) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: AI_JOB_UNDERSTANDING_SCHEMA,
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        "Gemini API returned HTTP " + response.status + ": " + detail.slice(0, 300),
      );
    }

    const payload: unknown = await response.json();
    return aiJobUnderstandingSchema.parse(JSON.parse(extractResponseText(payload)));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Gemini analysis timed out.");
    }
    throw error instanceof Error ? error : new Error("Gemini analysis failed.");
  } finally {
    clearTimeout(timeout);
  }
}
