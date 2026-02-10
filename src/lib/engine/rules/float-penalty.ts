import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * Float Penalty Rule (Soft)
 * Minimize floating staff to other units.
 * Staff should only be floated if they are cross-trained for that unit.
 * Penalizes float assignments to encourage home unit scheduling.
 */
export const floatPenaltyRule: RuleEvaluator = {
  id: "float-penalty",
  name: "Minimize Float Assignments",
  type: "soft",
  category: "preference",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    for (const a of context.assignments) {
      if (!a.isFloat) continue;

      const staffInfo = context.staffMap.get(a.staffId);
      if (!staffInfo) continue;

      const shiftInfo = context.shiftMap.get(a.shiftId);
      if (!shiftInfo) continue;

      const staffName = `${staffInfo.firstName} ${staffInfo.lastName}`;

      // Check if staff is cross-trained for this unit
      const isCrossTrained = staffInfo.crossTrainedUnits.some(
        (u) => u.toUpperCase() === shiftInfo.unit.toUpperCase()
      );

      if (!isCrossTrained) {
        // Higher penalty for floating to a unit they're not trained for
        violations.push({
          ruleId: "float-penalty",
          ruleName: "Minimize Float Assignments",
          ruleType: "soft",
          shiftId: a.shiftId,
          staffId: a.staffId,
          description: `${staffName} is floated to ${shiftInfo.unit} on ${shiftInfo.date} but is not cross-trained for this unit`,
          penaltyScore: 1.0,
        });
      } else {
        // Lower penalty for floating even when cross-trained (still want to minimize)
        violations.push({
          ruleId: "float-penalty",
          ruleName: "Minimize Float Assignments",
          ruleType: "soft",
          shiftId: a.shiftId,
          staffId: a.staffId,
          description: `${staffName} is floated from ${a.floatFromUnit ?? staffInfo.homeUnit ?? "home unit"} to ${shiftInfo.unit} on ${shiftInfo.date}`,
          penaltyScore: 0.3,
        });
      }
    }

    return violations;
  },
};
