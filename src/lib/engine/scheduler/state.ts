import type { AssignmentDraft } from "./types";

// ─── Date / time helpers ─────────────────────────────────────────────────────

export function toDateTime(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export function shiftEndDateTime(
  date: string,
  startTime: string,
  durationHours: number
): Date {
  const start = toDateTime(date, startTime);
  return new Date(start.getTime() + durationHours * 60 * 60 * 1000);
}

export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // days to preceding Monday
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}

function getWeekendId(dateStr: string): string {
  // Anchor Sunday back to Saturday so both share the same weekend identifier
  const date = new Date(dateStr);
  if (date.getDay() === 0) date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10); // Saturday date as the ID
}

// ─── SchedulerState ──────────────────────────────────────────────────────────

/**
 * Mutable state maintained during greedy construction.
 * All lookups are O(1) or O(assignments per staff), avoiding full scans.
 */
export class SchedulerState {
  private assignmentsByStaff = new Map<string, AssignmentDraft[]>();
  private assignmentsByShift = new Map<string, AssignmentDraft[]>();
  private workedDatesByStaff = new Map<string, Set<string>>();

  addAssignment(draft: AssignmentDraft): void {
    // Staff list (kept sorted by date for binary-search-ability later)
    const staffList = this.assignmentsByStaff.get(draft.staffId) ?? [];
    staffList.push(draft);
    staffList.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime < b.startTime ? -1 : 1
    );
    this.assignmentsByStaff.set(draft.staffId, staffList);

    // Shift list
    const shiftList = this.assignmentsByShift.get(draft.shiftId) ?? [];
    shiftList.push(draft);
    this.assignmentsByShift.set(draft.shiftId, shiftList);

    // Worked dates set
    const dates = this.workedDatesByStaff.get(draft.staffId) ?? new Set<string>();
    dates.add(draft.date);
    this.workedDatesByStaff.set(draft.staffId, dates);
  }

  getStaffAssignments(staffId: string): AssignmentDraft[] {
    return this.assignmentsByStaff.get(staffId) ?? [];
  }

  getShiftAssignments(shiftId: string): AssignmentDraft[] {
    return this.assignmentsByShift.get(shiftId) ?? [];
  }

  /**
   * Returns the end Date of the last shift for `staffId` that finishes
   * before the given new shift starts (needed for rest-hours check).
   */
  getLastShiftEndBefore(staffId: string, newShiftStart: Date): Date | null {
    const list = this.assignmentsByStaff.get(staffId) ?? [];
    let lastEnd: Date | null = null;
    for (const a of list) {
      const end = shiftEndDateTime(a.date, a.startTime, a.durationHours);
      if (end.getTime() <= newShiftStart.getTime()) {
        if (!lastEnd || end > lastEnd) lastEnd = end;
      }
    }
    return lastEnd;
  }

  /**
   * Returns true if adding an assignment on `targetDate` would result in
   * a consecutive run longer than `maxConsecutive` days.
   */
  wouldExceedConsecutiveDays(staffId: string, targetDate: string, maxConsecutive: number): boolean {
    const dates = this.workedDatesByStaff.get(staffId) ?? new Set<string>();
    const d = new Date(targetDate);
    let count = 1; // the target day itself

    // Count backwards
    for (let i = 1; i <= maxConsecutive; i++) {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - i);
      if (dates.has(prev.toISOString().slice(0, 10))) count++;
      else break;
    }
    // Count forwards
    for (let i = 1; i <= maxConsecutive; i++) {
      const next = new Date(d);
      next.setDate(next.getDate() + i);
      if (dates.has(next.toISOString().slice(0, 10))) count++;
      else break;
    }

    return count > maxConsecutive;
  }

  /** Hours already worked during the calendar week (Mon–Sun) containing `date`. */
  getWeeklyHours(staffId: string, date: string): number {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(weekStart);
    return (this.assignmentsByStaff.get(staffId) ?? [])
      .filter((a) => a.date >= weekStart && a.date <= weekEnd)
      .reduce((sum, a) => sum + a.durationHours, 0);
  }

  /** Hours worked in the rolling 7-day window ending on (and including) `date`. */
  getRolling7DayHours(staffId: string, date: string): number {
    const endDate = new Date(date);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 6);
    const startStr = startDate.toISOString().slice(0, 10);
    return (this.assignmentsByStaff.get(staffId) ?? [])
      .filter((a) => a.date >= startStr && a.date <= date)
      .reduce((sum, a) => sum + a.durationHours, 0);
  }

  /** Total number of weekend-day assignments for `staffId` so far. */
  getWeekendCount(staffId: string): number {
    return (this.assignmentsByStaff.get(staffId) ?? []).filter((a) => {
      const day = new Date(a.date).getDay();
      return day === 0 || day === 6;
    }).length;
  }

  /** Count on-call shifts this calendar week for `staffId`. */
  getOnCallCountThisWeek(staffId: string, date: string): number {
    const weekStart = getWeekStart(date);
    const weekEnd = getWeekEnd(weekStart);
    return (this.assignmentsByStaff.get(staffId) ?? []).filter(
      (a) => a.date >= weekStart && a.date <= weekEnd && a.shiftType === "on_call"
    ).length;
  }

  /** Count distinct weekends in the current month where `staffId` is on-call. */
  getOnCallWeekendsThisMonth(staffId: string, date: string): number {
    const month = date.slice(0, 7); // YYYY-MM
    const weekendIds = new Set<string>();
    for (const a of this.assignmentsByStaff.get(staffId) ?? []) {
      if (!a.date.startsWith(month) || a.shiftType !== "on_call") continue;
      const d = new Date(a.date).getDay();
      if (d === 0 || d === 6) weekendIds.add(getWeekendId(a.date));
    }
    return weekendIds.size;
  }

  /** True if `staffId` has any existing assignment whose time overlaps [start, end). */
  hasOverlapWith(staffId: string, newStart: Date, newEnd: Date): boolean {
    for (const a of this.assignmentsByStaff.get(staffId) ?? []) {
      const aStart = toDateTime(a.date, a.startTime);
      const aEnd = shiftEndDateTime(a.date, a.startTime, a.durationHours);
      if (aStart < newEnd && aEnd > newStart) return true;
    }
    return false;
  }

  /** Shallow clone for local-search swap evaluation. */
  clone(): SchedulerState {
    const copy = new SchedulerState();
    for (const [id, list] of this.assignmentsByStaff) {
      copy.assignmentsByStaff.set(id, [...list]);
    }
    for (const [id, list] of this.assignmentsByShift) {
      copy.assignmentsByShift.set(id, [...list]);
    }
    for (const [id, dates] of this.workedDatesByStaff) {
      copy.workedDatesByStaff.set(id, new Set(dates));
    }
    return copy;
  }
}
