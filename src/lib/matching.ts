/**
 * Presentation helpers only.
 *
 * The authoritative matching engine is ./career-engine (calculateJobMatch).
 * The old flat scorer that lived here was removed in V1.1 so that no page can
 * produce a second, different score for the same job.
 */

export function formatSalary(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "$0";
  const thousands = value / 1000;
  const formatted = Number.isInteger(thousands)
    ? String(thousands)
    : thousands.toFixed(1).replace(/\\.0$/, "");
  return `${formatted}k`;
}

export function labelMode(mode: string) {
  if (mode === "remote") return "Remote";
  if (mode === "hybrid") return "Hybrid";
  if (mode === "onsite") return "On-site";
  return "Flexible";
}

export function fitLabel(score: number) {
  if (score >= 85) return "High fit";
  if (score >= 70) return "Solid fit";
  if (score >= 55) return "Partial fit";
  return "Low fit";
}
