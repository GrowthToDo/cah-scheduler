import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const patientRatioRule: RuleEvaluator = {
  id: "patient-ratio",
  name: "Patient-to-Nurse Ratio",
  type: "hard",
  category: "staffing",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const [shiftId, shift] of context.shiftMap) {
      if (shift.actualCensus === null) continue;

      const band = context.censusBands.find(
        (b) =>
          shift.actualCensus! >= b.minPatients &&
          shift.actualCensus! <= b.maxPatients
      );
      if (!band) continue;

      const shiftAssignments = context.assignments.filter(
        (a) => a.shiftId === shiftId
      );

      // Count only RNs for ratio calculation
      const rnCount = shiftAssignments.filter((a) => {
        const staff = context.staffMap.get(a.staffId);
        return staff?.role === "RN";
      }).length;

      if (rnCount === 0 && shift.actualCensus > 0) {
        violations.push({
          ruleId: "patient-ratio",
          ruleName: "Patient-to-Nurse Ratio",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) has ${shift.actualCensus} patients but no RNs assigned`,
        });
        continue;
      }

      // Parse ratio like "2:1" → max 2 patients per nurse
      const [maxPatients] = band.patientToNurseRatio.split(":").map(Number);
      const actualRatio = rnCount > 0 ? shift.actualCensus / rnCount : Infinity;

      if (actualRatio > maxPatients) {
        violations.push({
          ruleId: "patient-ratio",
          ruleName: "Patient-to-Nurse Ratio",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}): ratio is ${actualRatio.toFixed(1)}:1, max allowed is ${maxPatients}:1`,
        });
      }
    }

    return violations;
  },
};
