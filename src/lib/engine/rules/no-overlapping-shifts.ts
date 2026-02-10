import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * No Overlapping Shifts Rule (Hard)
 * A staff member cannot be assigned to shifts that overlap in time on the same day.
 * This is a hard constraint - there should be no way for one person to work two shifts at once.
 */
export const noOverlappingShiftsRule: RuleEvaluator = {
  id: "no-overlapping-shifts",
  name: "No Overlapping Shifts",
  type: "hard",
  category: "rest",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Group assignments by staff
    const staffAssignments = new Map<string, typeof context.assignments>();
    for (const a of context.assignments) {
      const existing = staffAssignments.get(a.staffId) ?? [];
      existing.push(a);
      staffAssignments.set(a.staffId, existing);
    }

    // Helper to convert time string to minutes from midnight
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Helper to check if two time ranges overlap
    const shiftsOverlap = (
      start1: string,
      end1: string,
      start2: string,
      end2: string,
      date1: string,
      date2: string
    ): boolean => {
      // If different dates, check for overnight shifts
      if (date1 !== date2) {
        // Check if one shift is overnight and spans into the other date
        const start1Min = timeToMinutes(start1);
        const end1Min = timeToMinutes(end1);
        const start2Min = timeToMinutes(start2);
        const end2Min = timeToMinutes(end2);

        // Shift 1 is overnight (end time < start time)
        const shift1Overnight = end1Min < start1Min;
        // Shift 2 is overnight
        const shift2Overnight = end2Min < start2Min;

        // Check date difference
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const dayDiff = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);

        if (dayDiff > 1) return false; // More than 1 day apart, no overlap

        if (dayDiff === 1) {
          // Adjacent dates - check if overnight shift from earlier date overlaps
          const earlierDate = d1 < d2 ? date1 : date2;
          const earlierStart = earlierDate === date1 ? start1Min : start2Min;
          const earlierEnd = earlierDate === date1 ? end1Min : end2Min;
          const laterStart = earlierDate === date1 ? start2Min : start1Min;
          const isEarlierOvernight = earlierEnd < earlierStart;

          if (isEarlierOvernight) {
            // Overnight shift ends on the later date
            // Check if it overlaps with the later shift
            return earlierEnd > laterStart;
          }
        }

        return false;
      }

      // Same date - check for time overlap
      const start1Min = timeToMinutes(start1);
      let end1Min = timeToMinutes(end1);
      const start2Min = timeToMinutes(start2);
      let end2Min = timeToMinutes(end2);

      // Handle overnight shifts (end time < start time means it ends next day)
      if (end1Min < start1Min) end1Min += 24 * 60;
      if (end2Min < start2Min) end2Min += 24 * 60;

      // Check overlap
      return start1Min < end2Min && start2Min < end1Min;
    };

    // Check each staff member's assignments for overlaps
    for (const [staffId, assignments] of staffAssignments) {
      if (assignments.length < 2) continue;

      const staffInfo = context.staffMap.get(staffId);
      const staffName = staffInfo
        ? `${staffInfo.firstName} ${staffInfo.lastName}`
        : "Unknown";

      // Sort by date and start time
      const sorted = [...assignments].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

      // Compare each pair
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a1 = sorted[i];
          const a2 = sorted[j];

          if (
            shiftsOverlap(
              a1.startTime,
              a1.endTime,
              a2.startTime,
              a2.endTime,
              a1.date,
              a2.date
            )
          ) {
            const shift1 = context.shiftMap.get(a1.shiftId);
            const shift2 = context.shiftMap.get(a2.shiftId);

            violations.push({
              ruleId: "no-overlapping-shifts",
              ruleName: "No Overlapping Shifts",
              ruleType: "hard",
              shiftId: a1.shiftId,
              staffId,
              description: `${staffName} is assigned to overlapping shifts: ${shift1?.shiftType ?? "shift"} on ${a1.date} (${a1.startTime}-${a1.endTime}) and ${shift2?.shiftType ?? "shift"} on ${a2.date} (${a2.startTime}-${a2.endTime})`,
            });
          }
        }
      }
    }

    return violations;
  },
};
