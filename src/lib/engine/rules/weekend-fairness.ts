import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const weekendFairnessRule: RuleEvaluator = {
  id: "weekend-fairness",
  name: "Weekend Fairness",
  type: "soft",
  category: "fairness",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Count weekend shifts per staff
    const weekendCounts = new Map<string, number>();
    const activeStaff = new Set<string>();

    for (const a of context.assignments) {
      activeStaff.add(a.staffId);
      const day = new Date(a.date).getDay();
      if (day === 0 || day === 6) {
        weekendCounts.set(a.staffId, (weekendCounts.get(a.staffId) ?? 0) + 1);
      }
    }

    // Ensure all active staff are in the map
    for (const staffId of activeStaff) {
      if (!weekendCounts.has(staffId)) {
        weekendCounts.set(staffId, 0);
      }
    }

    if (weekendCounts.size < 2) return violations;

    // Calculate standard deviation
    const counts = [...weekendCounts.values()];
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    // Flag staff who are significantly above average
    if (stdDev > 1) {
      for (const [staffId, count] of weekendCounts) {
        if (count > mean + stdDev) {
          const staff = context.staffMap.get(staffId);
          violations.push({
            ruleId: "weekend-fairness",
            ruleName: "Weekend Fairness",
            ruleType: "soft",
            shiftId: "",
            staffId,
            description: `${staff?.firstName} ${staff?.lastName} has ${count} weekend shifts (avg: ${mean.toFixed(1)}, std: ${stdDev.toFixed(1)})`,
            penaltyScore: (count - mean) / Math.max(mean, 1),
          });
        }
      }
    }

    return violations;
  },
};
