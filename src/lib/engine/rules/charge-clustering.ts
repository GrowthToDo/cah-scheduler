import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * Charge Nurse Clustering Rule (Soft)
 * Prevent too many charge-qualified nurses from being scheduled together on the same shift.
 * This keeps charge nurses distributed across shifts so there's backup coverage.
 *
 * Logic:
 * 1. Calculate average charge-qualified count per shift
 * 2. If a shift has more than (average + 1) charge-qualified nurses, apply penalty
 */
export const chargeClusteringRule: RuleEvaluator = {
  id: "charge-clustering",
  name: "Charge Nurse Distribution",
  type: "soft",
  category: "skill",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Count charge-qualified staff per shift
    const shiftChargeCounts = new Map<string, { count: number; staffNames: string[] }>();

    for (const a of context.assignments) {
      const staffInfo = context.staffMap.get(a.staffId);
      if (!staffInfo?.isChargeNurseQualified) continue;

      const existing = shiftChargeCounts.get(a.shiftId) ?? { count: 0, staffNames: [] };
      existing.count++;
      existing.staffNames.push(`${staffInfo.firstName} ${staffInfo.lastName}`);
      shiftChargeCounts.set(a.shiftId, existing);
    }

    if (shiftChargeCounts.size === 0) return violations;

    // Calculate average
    const totalCharge = [...shiftChargeCounts.values()].reduce((sum, v) => sum + v.count, 0);
    const shiftCount = context.shiftMap.size;
    const average = shiftCount > 0 ? totalCharge / shiftCount : 1;

    // Threshold: average + 1 (with minimum of 2)
    const threshold = Math.max(average + 1, 2);

    // Check each shift
    for (const [shiftId, data] of shiftChargeCounts) {
      if (data.count > threshold) {
        const shiftInfo = context.shiftMap.get(shiftId);
        if (!shiftInfo) continue;

        const excess = data.count - Math.ceil(threshold);
        violations.push({
          ruleId: "charge-clustering",
          ruleName: "Charge Nurse Distribution",
          ruleType: "soft",
          shiftId,
          description: `${shiftInfo.shiftType} shift on ${shiftInfo.date} has ${data.count} charge-qualified nurses (${data.staffNames.join(", ")}), exceeding threshold of ${Math.ceil(threshold)}. Consider distributing to other shifts.`,
          penaltyScore: excess * 0.5,
        });
      }
    }

    return violations;
  },
};
