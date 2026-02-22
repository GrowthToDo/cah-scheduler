import type { RuleEvaluator, RuleContext, RuleViolation, AssignmentInfo } from "./types";

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

    // Group assignments by staff → week → list (to be sorted chronologically)
    const staffWeekAssignments = new Map<string, Map<string, AssignmentInfo[]>>();

    for (const a of context.assignments) {
      const shift = context.shiftMap.get(a.shiftId);
      // Only count shifts that count toward staffing
      if (!shift?.countsTowardStaffing) continue;

      const weekStart = getWeekStart(a.date);
      const staffWeeks = staffWeekAssignments.get(a.staffId) ?? new Map<string, AssignmentInfo[]>();
      const weekList = staffWeeks.get(weekStart) ?? [];
      weekList.push(a);
      staffWeeks.set(weekStart, weekList);
      staffWeekAssignments.set(a.staffId, staffWeeks);
    }

    // Walk through each staff member's week in chronological order.
    // Emit a violation only on the specific shift that crosses a threshold —
    // not on every shift the staff member works.
    for (const [staffId, weekAssignmentsMap] of staffWeekAssignments) {
      const staffInfo = context.staffMap.get(staffId);
      if (!staffInfo) continue;

      // Skip agency/PRN staff with no FTE commitment (fte = 0).
      // They are scheduled on-demand and have no standard weekly hours to enforce.
      if (staffInfo.fte === 0) continue;

      const staffName = `${staffInfo.firstName} ${staffInfo.lastName}`;
      const standardHours = Math.min(staffInfo.fte * 40, 40); // cap at 40

      for (const [weekStart, assignments] of weekAssignmentsMap) {
        // Sort chronologically so we detect the exact crossing point
        const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date));

        let cumulativeHours = 0;
        let extraHoursFlagged = false;
        let actualOtFlagged = false;

        for (const a of sorted) {
          cumulativeHours += a.durationHours;

          // Case 1: This shift pushes past 40h → actual overtime
          if (!actualOtFlagged && cumulativeHours > 40) {
            const overtimeHours = cumulativeHours - 40;
            const penaltyScore = (overtimeHours / 12) * actualOtPenaltyWeight;

            violations.push({
              ruleId: "overtime-v2",
              ruleName: "Overtime & Extra Hours",
              ruleType: "soft",
              shiftId: a.shiftId,
              staffId,
              description: `${staffName} reaches ${cumulativeHours.toFixed(1)}h in week of ${weekStart} — this shift causes ${overtimeHours.toFixed(1)}h of actual overtime (>40h)`,
              penaltyScore,
            });
            actualOtFlagged = true;
          }
          // Case 2: This shift pushes past standard hours (FTE×40) but stays ≤ 40h
          else if (!extraHoursFlagged && standardHours < 40 && cumulativeHours > standardHours && cumulativeHours <= 40) {
            const extraHours = cumulativeHours - standardHours;
            const penaltyScore = (extraHours / 12) * extraHoursPenaltyWeight;

            violations.push({
              ruleId: "overtime-v2",
              ruleName: "Overtime & Extra Hours",
              ruleType: "soft",
              shiftId: a.shiftId,
              staffId,
              description: `${staffName} (${staffInfo.fte} FTE, ${standardHours}h/week) reaches ${cumulativeHours.toFixed(1)}h in week of ${weekStart} — this shift adds ${extraHours.toFixed(1)}h above standard hours`,
              penaltyScore,
            });
            extraHoursFlagged = true;
          }
        }
      }
    }

    return violations;
  },
};
