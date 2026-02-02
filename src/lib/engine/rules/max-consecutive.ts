import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

export const maxConsecutiveRule: RuleEvaluator = {
  id: "max-consecutive",
  name: "Maximum Consecutive Days",
  type: "hard",
  category: "rest",
  evaluate(context: RuleContext): RuleViolation[] {
    const violations: RuleViolation[] = [];
    const maxDays = (context.ruleParameters.maxConsecutiveDays as number) ?? 5;

    // Group assignments by staff
    const staffAssignments = new Map<string, Set<string>>();
    for (const a of context.assignments) {
      const dates = staffAssignments.get(a.staffId) ?? new Set();
      dates.add(a.date);
      staffAssignments.set(a.staffId, dates);
    }

    for (const [staffId, dateSet] of staffAssignments) {
      const staff = context.staffMap.get(staffId);
      const dates = [...dateSet].sort();

      let consecutive = 1;
      let streakStart = dates[0];

      for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const curr = new Date(dates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          consecutive++;
          if (consecutive > maxDays) {
            violations.push({
              ruleId: "max-consecutive",
              ruleName: "Maximum Consecutive Days",
              ruleType: "hard",
              shiftId: context.assignments.find(
                (a) => a.staffId === staffId && a.date === dates[i]
              )?.shiftId ?? "",
              staffId,
              description: `${staff?.firstName} ${staff?.lastName} working ${consecutive} consecutive days (${streakStart} to ${dates[i]}), max allowed: ${maxDays}`,
            });
          }
        } else {
          consecutive = 1;
          streakStart = dates[i];
        }
      }
    }

    return violations;
  },
};
