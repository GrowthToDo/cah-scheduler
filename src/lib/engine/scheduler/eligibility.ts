import type { StaffInfo, ShiftInfo } from "@/lib/engine/rules/types";
import type { SchedulerContext } from "./types";
import { SchedulerState, toDateTime, shiftEndDateTime } from "./state";

const SUPERVISED_UNITS = ["ICU", "ER", "ED", "EMERGENCY"];

export function isICUUnit(unitName: string): boolean {
  const words = unitName.toUpperCase().split(/[\s\-_]+/);
  return SUPERVISED_UNITS.some((u) => words.includes(u));
}

/**
 * Returns true if assigning `staffInfo` to `shiftInfo` passes every hard rule.
 * Checks are ordered by cost — cheapest first, most expensive last.
 */
export function passesHardRules(
  staffInfo: StaffInfo,
  shiftInfo: ShiftInfo,
  state: SchedulerState,
  context: SchedulerContext
): boolean {
  const newStart = toDateTime(shiftInfo.date, shiftInfo.startTime);
  const newEnd = shiftEndDateTime(shiftInfo.date, shiftInfo.startTime, shiftInfo.durationHours);

  // 1. Approved leave blocks assignment
  const onLeave = context.staffLeaves.some(
    (l) =>
      l.staffId === staffInfo.id &&
      l.status === "approved" &&
      l.startDate <= shiftInfo.date &&
      l.endDate >= shiftInfo.date
  );
  if (onLeave) return false;

  // 2. PRN availability (per-diem must have submitted this date)
  if (staffInfo.employmentType === "per_diem") {
    const avail = context.prnAvailability.find((a) => a.staffId === staffInfo.id);
    if (!avail || !avail.availableDates.includes(shiftInfo.date)) return false;
  }

  // 3. ICU/ER competency (level ≥ 2)
  if (isICUUnit(shiftInfo.unit) && staffInfo.icuCompetencyLevel < 2) return false;

  // 4. No overlapping shifts
  if (state.hasOverlapWith(staffInfo.id, newStart, newEnd)) return false;

  // 5. Min rest between shifts (≥ 10 hours)
  const lastEnd = state.getLastShiftEndBefore(staffInfo.id, newStart);
  if (lastEnd) {
    const restHours = (newStart.getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
    if (restHours < 10) return false;
  }

  // 6. Max consecutive days (cap at 5; staff preference may be lower)
  const maxConsec = Math.min(staffInfo.preferences?.maxConsecutiveDays ?? 5, 5);
  if (state.wouldExceedConsecutiveDays(staffInfo.id, shiftInfo.date, maxConsec)) return false;

  // 7. Max 60 hours in any rolling 7-day window
  const rolling7 = state.getRolling7DayHours(staffInfo.id, shiftInfo.date);
  if (rolling7 + shiftInfo.durationHours > 60) return false;

  // 8. On-call limits
  if (shiftInfo.shiftType === "on_call") {
    const maxPerWeek = context.unitConfig?.maxOnCallPerWeek ?? 1;
    if (state.getOnCallCountThisWeek(staffInfo.id, shiftInfo.date) >= maxPerWeek) return false;

    const dayOfWeek = new Date(shiftInfo.date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const maxWeekendsPerMonth = context.unitConfig?.maxOnCallWeekendsPerMonth ?? 1;
      if (state.getOnCallWeekendsThisMonth(staffInfo.id, shiftInfo.date) >= maxWeekendsPerMonth)
        return false;
    }
  }

  return true;
}

/**
 * Returns human-readable reasons why `staffInfo` cannot be assigned to `shiftInfo`.
 * Used for understaffed-shift reporting.
 */
export function getRejectionReasons(
  staffInfo: StaffInfo,
  shiftInfo: ShiftInfo,
  state: SchedulerState,
  context: SchedulerContext
): string[] {
  const reasons: string[] = [];
  const newStart = toDateTime(shiftInfo.date, shiftInfo.startTime);
  const newEnd = shiftEndDateTime(shiftInfo.date, shiftInfo.startTime, shiftInfo.durationHours);

  const onLeave = context.staffLeaves.some(
    (l) =>
      l.staffId === staffInfo.id &&
      l.status === "approved" &&
      l.startDate <= shiftInfo.date &&
      l.endDate >= shiftInfo.date
  );
  if (onLeave) reasons.push("on approved leave");

  if (staffInfo.employmentType === "per_diem") {
    const avail = context.prnAvailability.find((a) => a.staffId === staffInfo.id);
    if (!avail || !avail.availableDates.includes(shiftInfo.date))
      reasons.push("PRN not available this date");
  }

  if (isICUUnit(shiftInfo.unit) && staffInfo.icuCompetencyLevel < 2)
    reasons.push("competency level too low for ICU/ER");

  if (state.hasOverlapWith(staffInfo.id, newStart, newEnd))
    reasons.push("overlapping shift already assigned");

  const lastEnd = state.getLastShiftEndBefore(staffInfo.id, newStart);
  if (lastEnd) {
    const restHours = (newStart.getTime() - lastEnd.getTime()) / (1000 * 60 * 60);
    if (restHours < 10)
      reasons.push(`insufficient rest (${restHours.toFixed(1)}h, need 10h)`);
  }

  const maxConsec = Math.min(staffInfo.preferences?.maxConsecutiveDays ?? 5, 5);
  if (state.wouldExceedConsecutiveDays(staffInfo.id, shiftInfo.date, maxConsec))
    reasons.push(`would exceed ${maxConsec} consecutive days`);

  const rolling7 = state.getRolling7DayHours(staffInfo.id, shiftInfo.date);
  if (rolling7 + shiftInfo.durationHours > 60)
    reasons.push(`would exceed 60h in 7 days (currently ${rolling7}h)`);

  if (shiftInfo.shiftType === "on_call") {
    const maxPerWeek = context.unitConfig?.maxOnCallPerWeek ?? 1;
    if (state.getOnCallCountThisWeek(staffInfo.id, shiftInfo.date) >= maxPerWeek)
      reasons.push("on-call weekly limit reached");
  }

  return reasons;
}
