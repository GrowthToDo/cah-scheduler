import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const chargeNurseRule: RuleEvaluator = {
  id: "charge-nurse",
  name: "Charge Nurse Required",
  type: "hard",
  category: "staffing",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const [shiftId, shift] of context.shiftMap) {
      if (!shift.requiresChargeNurse) continue;

      const shiftAssignments = context.assignments.filter(
        (a) => a.shiftId === shiftId
      );

      const hasChargeNurse = shiftAssignments.some((a) => {
        const staff = context.staffMap.get(a.staffId);
        // Valid charge: flagged as charge on this assignment, nurse is charge-qualified,
        // AND has Level 4+ competency (Level 5 = primary charge; Level 4 = stand-in).
        // Level 1–3 cannot be charge regardless of the isChargeNurseQualified flag.
        return (
          a.isChargeNurse &&
          staff?.isChargeNurseQualified === true &&
          (staff?.icuCompetencyLevel ?? 0) >= 4
        );
      });

      if (!hasChargeNurse && shiftAssignments.length > 0) {
        violations.push({
          ruleId: "charge-nurse",
          ruleName: "Charge Nurse Required",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) requires a charge nurse but none assigned`,
        });
      }
    }

    return violations;
  },
};
