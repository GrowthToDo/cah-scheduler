import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const minStaffRule: RuleEvaluator = {
  id: "min-staff",
  name: "Minimum Staff Per Shift",
  type: "hard",
  category: "staffing",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const [shiftId, shift] of context.shiftMap) {
      const shiftAssignments = context.assignments.filter(
        (a) => a.shiftId === shiftId
      );

      let requiredCount = shift.requiredStaffCount;

      // If census data is available, use census band requirements
      if (shift.actualCensus !== null) {
        const band = context.censusBands.find(
          (b) =>
            shift.actualCensus! >= b.minPatients &&
            shift.actualCensus! <= b.maxPatients
        );
        if (band) {
          requiredCount = band.requiredRNs + band.requiredCNAs;
        }
      }

      if (shiftAssignments.length < requiredCount) {
        violations.push({
          ruleId: "min-staff",
          ruleName: "Minimum Staff Per Shift",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) has ${shiftAssignments.length} staff, requires ${requiredCount}`,
        });
      }
    }

    return violations;
  },
};
