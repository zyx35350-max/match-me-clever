import type { JobRole, JobSemanticExtraction } from "./job-understanding-types";

export interface JobDirectionMapping {
  directionId: string;
  weight: number;
  source: "mapped-from-role" | "mapped-from-role-and-signals" | "explore-fallback";
}

/**
 * Maps the understood role into the user's career-direction taxonomy.
 *
 * This is deliberately deterministic and separate from the Career Engine:
 * the engine still owns all scoring and weights. A role with no reliable
 * bridge into the user's direction taxonomy falls back to "explore".
 */
export function mapJobRoleToDirections(
  role: JobRole,
  semantic?: Pick<JobSemanticExtraction, "careerDirections" | "internationalSignals">,
): JobDirectionMapping[] {
  const directionSignals = new Set(semantic?.careerDirections ?? []);

  switch (role) {
    case "international-sales":
      // Sales is not automatically AI Operations. Only connect it to
      // AI × E-commerce when the listing itself contains an e-commerce signal.
      return directionSignals.has("ai-ecommerce")
        ? [{ directionId: "ai-ecommerce", weight: 0.8, source: "mapped-from-role-and-signals" }]
        : [{ directionId: "explore", weight: 1, source: "explore-fallback" }];
    case "marketing":
      return [{ directionId: "ai-content", weight: 0.7, source: "mapped-from-role" }];
    case "product":
      return [{ directionId: "ai-product", weight: 0.8, source: "mapped-from-role" }];
    case "content":
      return [{ directionId: "ai-content", weight: 0.8, source: "mapped-from-role" }];
    case "operations":
      return [{ directionId: "ai-operations", weight: 0.8, source: "mapped-from-role" }];
    case "design":
      return [{ directionId: "ai-visual", weight: 0.8, source: "mapped-from-role" }];
    case "software-engineering":
      return [{ directionId: "explore", weight: 1, source: "explore-fallback" }];
    case "customer-service":
      return [{ directionId: "explore", weight: 1, source: "explore-fallback" }];
    case "unknown":
    default:
      return [{ directionId: "explore", weight: 1, source: "explore-fallback" }];
  }
}

export function primaryCareerDirection(
  role: JobRole,
  semantic?: Pick<JobSemanticExtraction, "careerDirections" | "internationalSignals">,
) {
  return mapJobRoleToDirections(role, semantic)[0]?.directionId;
}
