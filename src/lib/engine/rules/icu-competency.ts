import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const icuCompetencyRule: RuleEvaluator = {
  id: "icu-competency",
  name: "ICU Competency Minimum",
  type: "hard",
  category: "skill",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const minLevel = (context.ruleParameters.minLevel as number) ?? 2;

    for (const a of context.assignments) {
      const staff = context.staffMap.get(a.staffId);
      if (!staff) continue;

      if (staff.icuCompetencyLevel < minLevel) {
        violations.push({
          ruleId: "icu-competency",
          ruleName: "ICU Competency Minimum",
          ruleType: "hard",
          shiftId: a.shiftId,
          staffId: a.staffId,
          description: `${staff.firstName} ${staff.lastName} has ICU competency ${staff.icuCompetencyLevel}, minimum required is ${minLevel}`,
        });
      }
    }

    return violations;
  },
};
