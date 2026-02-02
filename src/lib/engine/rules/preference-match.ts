import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const preferenceMatchRule: RuleEvaluator = {
  id: "preference-match",
  name: "Staff Preference Match",
  type: "soft",
  category: "preference",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];

    for (const a of context.assignments) {
      const staff = context.staffMap.get(a.staffId);
      if (!staff?.preferences) continue;

      const prefs = staff.preferences;

      // Check shift type preference
      if (prefs.preferredShift !== "any" && prefs.preferredShift !== a.shiftType) {
        violations.push({
          ruleId: "preference-match",
          ruleName: "Staff Preference Match",
          ruleType: "soft",
          shiftId: a.shiftId,
          staffId: a.staffId,
          description: `${staff.firstName} ${staff.lastName} prefers ${prefs.preferredShift} shifts but assigned to ${a.shiftType} on ${a.date}`,
          penaltyScore: 0.5,
        });
      }

      // Check preferred days off
      const dayOfWeek = new Date(a.date).toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (prefs.preferredDaysOff.includes(dayOfWeek)) {
        violations.push({
          ruleId: "preference-match",
          ruleName: "Staff Preference Match",
          ruleType: "soft",
          shiftId: a.shiftId,
          staffId: a.staffId,
          description: `${staff.firstName} ${staff.lastName} prefers ${dayOfWeek} off but is scheduled on ${a.date}`,
          penaltyScore: 0.7,
        });
      }

      // Check weekend avoidance
      if (prefs.avoidWeekends) {
        const day = new Date(a.date).getDay();
        if (day === 0 || day === 6) {
          violations.push({
            ruleId: "preference-match",
            ruleName: "Staff Preference Match",
            ruleType: "soft",
            shiftId: a.shiftId,
            staffId: a.staffId,
            description: `${staff.firstName} ${staff.lastName} prefers no weekends but scheduled on ${a.date}`,
            penaltyScore: 0.6,
          });
        }
      }
    }

    return violations;
  },
};
