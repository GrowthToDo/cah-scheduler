import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const overtimeCostRule: RuleEvaluator = {
  id: "overtime-cost",
  name: "Minimize Overtime",
  type: "soft",
  category: "cost",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    // Calculate weekly hours per staff member
    const weeklyHours = new Map<string, Map<string, number>>();

    for (const a of context.assignments) {
      const weekKey = getWeekKey(a.date);
      const staffWeeks = weeklyHours.get(a.staffId) ?? new Map();
      const currentHours = staffWeeks.get(weekKey) ?? 0;
      staffWeeks.set(weekKey, currentHours + a.durationHours);
      weeklyHours.set(a.staffId, staffWeeks);
    }

    for (const [staffId, weeks] of weeklyHours) {
      const staff = context.staffMap.get(staffId);
      if (!staff) continue;

      const standardHours = staff.fte * 40;

      for (const [weekKey, hours] of weeks) {
        if (hours > standardHours && standardHours > 0) {
          const otHours = hours - standardHours;
          violations.push({
            ruleId: "overtime-cost",
            ruleName: "Minimize Overtime",
            ruleType: "soft",
            shiftId: "",
            staffId,
            description: `${staff.firstName} ${staff.lastName} has ${otHours.toFixed(1)}h overtime in week of ${weekKey}`,
            penaltyScore: otHours / 12, // Normalize: 12h OT = 1.0 penalty
          });
        }
      }
    }

    return violations;
  },
};

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((day + 6) % 7));
  return monday.toISOString().split("T")[0];
}
