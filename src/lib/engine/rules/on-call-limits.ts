import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * On-Call Limits Rule (Hard)
 * - No staff can be scheduled for on-call more than maxOnCallPerWeek times per week
 * - No staff can be scheduled for on-call more than maxOnCallWeekendsPerMonth weekends per month
 * These limits are configurable per unit.
 */
export const onCallLimitsRule: RuleEvaluator = {
  id: "on-call-limits",
  name: "On-Call Limits",
  type: "hard",
  category: "rest",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Get limits from unit config or use defaults
    const maxPerWeek = context.unitConfig?.maxOnCallPerWeek ?? 1;
    const maxWeekendsPerMonth = context.unitConfig?.maxOnCallWeekendsPerMonth ?? 1;

    // Filter to only on-call assignments
    const onCallAssignments = context.assignments.filter((a) => {
      const shift = context.shiftMap.get(a.shiftId);
      return shift?.shiftType === "on_call";
    });

    if (onCallAssignments.length === 0) return violations;

    // Group by staff
    const staffOnCalls = new Map<string, typeof onCallAssignments>();
    for (const a of onCallAssignments) {
      const existing = staffOnCalls.get(a.staffId) ?? [];
      existing.push(a);
      staffOnCalls.set(a.staffId, existing);
    }

    // Helper to get week number
    const getWeekNumber = (dateStr: string): string => {
      const date = new Date(dateStr);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return `${date.getFullYear()}-W${weekNum}`;
    };

    // Helper to get month
    const getMonth = (dateStr: string): string => {
      return dateStr.substring(0, 7); // YYYY-MM
    };

    // Helper to check if date is weekend
    const isWeekend = (dateStr: string): boolean => {
      const date = new Date(dateStr);
      const day = date.getDay();
      return day === 0 || day === 6;
    };

    // Check each staff member
    for (const [staffId, assignments] of staffOnCalls) {
      const staffInfo = context.staffMap.get(staffId);
      const staffName = staffInfo
        ? `${staffInfo.firstName} ${staffInfo.lastName}`
        : "Unknown";

      // Count on-calls per week
      const weekCounts = new Map<string, number>();
      for (const a of assignments) {
        const week = getWeekNumber(a.date);
        weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
      }

      // Check weekly limit
      for (const [week, count] of weekCounts) {
        if (count > maxPerWeek) {
          violations.push({
            ruleId: "on-call-limits",
            ruleName: "On-Call Limits",
            ruleType: "hard",
            shiftId: assignments[0].shiftId,
            staffId,
            description: `${staffName} has ${count} on-call shifts in week ${week}, exceeding limit of ${maxPerWeek}`,
          });
        }
      }

      // Count weekend on-calls per month
      const monthWeekendCounts = new Map<string, Set<string>>();
      for (const a of assignments) {
        if (!isWeekend(a.date)) continue;
        const month = getMonth(a.date);
        const weekend = getWeekNumber(a.date); // Use week to identify unique weekends
        const existing = monthWeekendCounts.get(month) ?? new Set();
        existing.add(weekend);
        monthWeekendCounts.set(month, existing);
      }

      // Check monthly weekend limit
      for (const [month, weekends] of monthWeekendCounts) {
        if (weekends.size > maxWeekendsPerMonth) {
          violations.push({
            ruleId: "on-call-limits",
            ruleName: "On-Call Limits",
            ruleType: "hard",
            shiftId: assignments[0].shiftId,
            staffId,
            description: `${staffName} has on-call on ${weekends.size} weekends in ${month}, exceeding limit of ${maxWeekendsPerMonth}`,
          });
        }
      }
    }

    return violations;
  },
};

/**
 * Maximum Hours Rule (Hard)
 * No staff can work more than 60 hours in any rolling 7-day period.
 * This is a safety limit to prevent fatigue.
 */
export const maxHoursRule: RuleEvaluator = {
  id: "max-hours-60",
  name: "Maximum 60 Hours in 7 Days",
  type: "hard",
  category: "rest",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];
    const maxHours = (context.ruleParameters.maxHours as number) ?? 60;

    // Group assignments by staff
    const staffAssignments = new Map<string, typeof context.assignments>();
    for (const a of context.assignments) {
      // Only count shifts that count toward staffing (not on-call unless activated)
      const shift = context.shiftMap.get(a.shiftId);
      if (!shift?.countsTowardStaffing) continue;

      const existing = staffAssignments.get(a.staffId) ?? [];
      existing.push(a);
      staffAssignments.set(a.staffId, existing);
    }

    // Get all unique dates in the schedule
    const allDates = new Set<string>();
    for (const a of context.assignments) {
      allDates.add(a.date);
    }
    const sortedDates = [...allDates].sort();

    if (sortedDates.length === 0) return violations;

    // For each staff, check rolling 7-day windows
    for (const [staffId, assignments] of staffAssignments) {
      const staffInfo = context.staffMap.get(staffId);
      const staffName = staffInfo
        ? `${staffInfo.firstName} ${staffInfo.lastName}`
        : "Unknown";

      // Create a map of date -> hours worked
      const dateHours = new Map<string, number>();
      for (const a of assignments) {
        const current = dateHours.get(a.date) ?? 0;
        dateHours.set(a.date, current + a.durationHours);
      }

      // Check each possible 7-day window
      const startDate = new Date(sortedDates[0]);
      const endDate = new Date(sortedDates[sortedDates.length - 1]);

      for (
        let windowStart = new Date(startDate);
        windowStart <= endDate;
        windowStart.setDate(windowStart.getDate() + 1)
      ) {
        let totalHours = 0;
        const windowDates: string[] = [];

        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(windowStart);
          checkDate.setDate(checkDate.getDate() + i);
          const dateStr = checkDate.toISOString().split("T")[0];
          windowDates.push(dateStr);
          totalHours += dateHours.get(dateStr) ?? 0;
        }

        if (totalHours > maxHours) {
          violations.push({
            ruleId: "max-hours-60",
            ruleName: "Maximum 60 Hours in 7 Days",
            ruleType: "hard",
            shiftId: assignments[0]?.shiftId ?? "",
            staffId,
            description: `${staffName} has ${totalHours} hours scheduled in 7-day period starting ${windowDates[0]}, exceeding limit of ${maxHours} hours`,
          });
          // Only report once per staff (the first violation found)
          break;
        }
      }
    }

    return violations;
  },
};
