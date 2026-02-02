import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const skillMixRule: RuleEvaluator = {
  id: "skill-mix",
  name: "Skill Mix Diversity",
  type: "soft",
  category: "skill",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const [shiftId, shift] of context.shiftMap) {
      const shiftAssignments = context.assignments.filter(
        (a) => a.shiftId === shiftId
      );

      if (shiftAssignments.length < 2) continue;

      const levels = shiftAssignments
        .map((a) => context.staffMap.get(a.staffId)?.icuCompetencyLevel ?? 0)
        .filter((l) => l > 0);

      if (levels.length < 2) continue;

      const min = Math.min(...levels);
      const max = Math.max(...levels);
      const range = max - min;

      // If all staff are at the same level, it's a skill mix issue
      if (range === 0) {
        violations.push({
          ruleId: "skill-mix",
          ruleName: "Skill Mix Diversity",
          ruleType: "soft",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) has all staff at competency level ${min} - no experience mix`,
          penaltyScore: 0.6,
        });
      } else if (range === 1 && max <= 3) {
        violations.push({
          ruleId: "skill-mix",
          ruleName: "Skill Mix Diversity",
          ruleType: "soft",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) has limited skill range (${min}-${max}), consider adding senior staff`,
          penaltyScore: 0.3,
        });
      }
    }

    return violations;
  },
};
