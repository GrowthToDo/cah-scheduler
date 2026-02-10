import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * PRN Availability Rule (Hard)
 * PRN (per diem) staff can ONLY be scheduled on days they have marked as available.
 * This is a hard constraint - PRN staff submit their availability, not days off.
 * If they didn't mark a day as available, they cannot be scheduled.
 */
export const prnAvailabilityRule: RuleEvaluator = {
  id: "prn-availability",
  name: "PRN Availability",
  type: "hard",
  category: "preference",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Build a map of PRN staff availability
    const prnAvailabilityMap = new Map<string, Set<string>>();
    for (const pa of context.prnAvailability) {
      prnAvailabilityMap.set(pa.staffId, new Set(pa.availableDates));
    }

    // Check each assignment
    for (const assignment of context.assignments) {
      const staffInfo = context.staffMap.get(assignment.staffId);
      if (!staffInfo) continue;

      // Only check per_diem staff
      if (staffInfo.employmentType !== "per_diem") continue;

      const staffName = `${staffInfo.firstName} ${staffInfo.lastName}`;
      const assignmentDate = assignment.date;

      // Get availability for this staff
      const availableDates = prnAvailabilityMap.get(assignment.staffId);

      // If no availability submitted, they cannot be scheduled
      if (!availableDates) {
        violations.push({
          ruleId: "prn-availability",
          ruleName: "PRN Availability",
          ruleType: "hard",
          shiftId: assignment.shiftId,
          staffId: assignment.staffId,
          description: `${staffName} (PRN) is scheduled on ${assignmentDate} but has not submitted availability for this schedule period`,
        });
        continue;
      }

      // Check if they are available on this date
      if (!availableDates.has(assignmentDate)) {
        violations.push({
          ruleId: "prn-availability",
          ruleName: "PRN Availability",
          ruleType: "hard",
          shiftId: assignment.shiftId,
          staffId: assignment.staffId,
          description: `${staffName} (PRN) is scheduled on ${assignmentDate} but did not mark this date as available`,
        });
      }
    }

    return violations;
  },
};

/**
 * Staff On Leave Rule (Hard)
 * Staff members cannot be scheduled on days when they have approved leave.
 */
export const staffOnLeaveRule: RuleEvaluator = {
  id: "staff-on-leave",
  name: "Staff On Leave",
  type: "hard",
  category: "preference",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Build a map of staff leave dates
    const staffLeaveDates = new Map<string, { startDate: string; endDate: string }[]>();
    for (const leave of context.staffLeaves) {
      if (leave.status !== "approved") continue;
      const existing = staffLeaveDates.get(leave.staffId) ?? [];
      existing.push({ startDate: leave.startDate, endDate: leave.endDate });
      staffLeaveDates.set(leave.staffId, existing);
    }

    // Check each assignment
    for (const assignment of context.assignments) {
      const staffInfo = context.staffMap.get(assignment.staffId);
      if (!staffInfo) continue;

      const staffName = `${staffInfo.firstName} ${staffInfo.lastName}`;
      const assignmentDate = assignment.date;

      // Check if staff is on leave during this date
      const leaves = staffLeaveDates.get(assignment.staffId);
      if (!leaves) continue;

      for (const leave of leaves) {
        if (assignmentDate >= leave.startDate && assignmentDate <= leave.endDate) {
          violations.push({
            ruleId: "staff-on-leave",
            ruleName: "Staff On Leave",
            ruleType: "hard",
            shiftId: assignment.shiftId,
            staffId: assignment.staffId,
            description: `${staffName} is scheduled on ${assignmentDate} but has approved leave from ${leave.startDate} to ${leave.endDate}`,
          });
          break; // Only report once per assignment
        }
      }
    }

    return violations;
  },
};
