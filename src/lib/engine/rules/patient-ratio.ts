import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * Patient-to-Licensed-Staff Ratio Rule (Hard)
 * The ratio of patients to licensed staff (RN + LPN) must not exceed
 * the maximum defined in the census band.
 *
 * Updated to count both RNs and LPNs as licensed staff per Texas regulations.
 */
export const patientRatioRule: RuleEvaluator = {
  id: "patient-ratio",
  name: "Patient-to-Licensed-Staff Ratio",
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

      // Count licensed staff (RN + LPN) for ratio calculation
      // This is the update per Pradeep's feedback - licensed staff includes both RNs and LPNs
      const licensedStaffCount = shiftAssignments.filter((a) => {
        const staff = context.staffMap.get(a.staffId);
        return staff?.role === "RN" || staff?.role === "LPN";
      }).length;

      if (licensedStaffCount === 0 && shift.actualCensus > 0) {
        violations.push({
          ruleId: "patient-ratio",
          ruleName: "Patient-to-Licensed-Staff Ratio",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}) has ${shift.actualCensus} patients but no licensed staff (RN/LPN) assigned`,
        });
        continue;
      }

      // Parse ratio like "2:1" → max 2 patients per licensed staff
      const [maxPatients] = band.patientToNurseRatio.split(":").map(Number);
      const actualRatio = licensedStaffCount > 0 ? shift.actualCensus / licensedStaffCount : Infinity;

      if (actualRatio > maxPatients) {
        violations.push({
          ruleId: "patient-ratio",
          ruleName: "Patient-to-Licensed-Staff Ratio",
          ruleType: "hard",
          shiftId,
          description: `Shift on ${shift.date} (${shift.shiftType}): ratio is ${actualRatio.toFixed(1)}:1 (${shift.actualCensus} patients / ${licensedStaffCount} licensed staff), max allowed is ${maxPatients}:1`,
        });
      }
    }

    return violations;
  },
};
