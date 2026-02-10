import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * Overtime Rules V2 (Soft)
 *
 * Updated overtime calculation per Pradeep's feedback:
 * 1. Hours > 40 in a fixed work week = HIGH penalty (actual overtime)
 * 2. Hours > (FTE * 40) but <= 40 = LOW penalty (extra hours but not OT)
 *
 * Example: A 0.9 FTE nurse (36 hours standard) picks up 4 extra hours:
 * - Total: 40 hours
 * - This is NOT overtime (not > 40), but IS extra hours (> 36)
 * - Apply low penalty for extra hours, not high OT penalty
 *
 * It's better to pay staff extra shift premium than OT or agency rates.
 */
export const overtimeRulesV2: RuleEvaluator = {
  id: "overtime-v2",
  name: "Overtime & Extra Hours",
  type: "soft",
  category: "cost",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Penalty weights
    const actualOtPenaltyWeight = (context.ruleParameters.actualOtPenaltyWeight as number) ?? 1.0;
    const extraHoursPenaltyWeight = (context.ruleParameters.extraHoursPenaltyWeight as number) ?? 0.3;

    // Group assignments by staff and week
    // Week is Monday-Sunday
    const getWeekStart = (dateStr: string): string => {
      const date = new Date(dateStr);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      const monday = new Date(date.setDate(diff));
      return monday.toISOString().split("T")[0];
    };

    // Build staff-week-hours map
    const staffWeekHours = new Map<string, Map<string, number>>();

    for (const a of context.assignments) {
      const shift = context.shiftMap.get(a.shiftId);
      // Only count shifts that count toward staffing
      if (!shift?.countsTowardStaffing) continue;

      const weekStart = getWeekStart(a.date);
      const staffWeeks = staffWeekHours.get(a.staffId) ?? new Map<string, number>();
      const currentHours = staffWeeks.get(weekStart) ?? 0;
      staffWeeks.set(weekStart, currentHours + a.durationHours);
      staffWeekHours.set(a.staffId, staffWeeks);
    }

    // Check each staff member's weekly hours
    for (const [staffId, weekHours] of staffWeekHours) {
      const staffInfo = context.staffMap.get(staffId);
      if (!staffInfo) continue;

      const staffName = `${staffInfo.firstName} ${staffInfo.lastName}`;
      const standardHours = staffInfo.fte * 40; // Expected hours based on FTE

      for (const [weekStart, hours] of weekHours) {
        // Case 1: Actual overtime (> 40 hours)
        if (hours > 40) {
          const overtimeHours = hours - 40;
          // Normalize penalty: 12 hours OT = 1.0 penalty
          const penaltyScore = (overtimeHours / 12) * actualOtPenaltyWeight;

          violations.push({
            ruleId: "overtime-v2",
            ruleName: "Overtime & Extra Hours",
            ruleType: "soft",
            shiftId: "",
            staffId,
            description: `${staffName} has ${hours} hours in week of ${weekStart}, ${overtimeHours.toFixed(1)} hours of actual overtime (>40h)`,
            penaltyScore,
          });
        }
        // Case 2: Extra hours but not overtime (> FTE*40 but <= 40)
        else if (hours > standardHours && hours <= 40) {
          const extraHours = hours - standardHours;
          // Lower penalty for extra hours (shift premium vs OT rate)
          const penaltyScore = (extraHours / 12) * extraHoursPenaltyWeight;

          violations.push({
            ruleId: "overtime-v2",
            ruleName: "Overtime & Extra Hours",
            ruleType: "soft",
            shiftId: "",
            staffId,
            description: `${staffName} (${staffInfo.fte} FTE) has ${hours} hours in week of ${weekStart}, ${extraHours.toFixed(1)} hours above standard ${standardHours}h (but within 40h limit)`,
            penaltyScore,
          });
        }
      }
    }

    return violations;
  },
};
