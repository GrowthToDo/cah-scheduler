/**
 * Pure helper: given a schedule's date range and a list of shift definitions,
 * returns the array of shift records to insert — one per day × per definition.
 *
 * Keeping this separate from the DB call makes it trivially testable.
 */
export interface ShiftDefinitionLike {
  id: string;
  requiredStaffCount: number;
  requiresChargeNurse: boolean;
}

export interface ShiftInsertValues {
  scheduleId: string;
  shiftDefinitionId: string;
  date: string; // YYYY-MM-DD
  requiredStaffCount: number;
  requiresChargeNurse: boolean;
}

/**
 * Enumerates every (date, definition) combination for the given range.
 * Both `startDate` and `endDate` are inclusive (YYYY-MM-DD strings).
 */
export function buildShiftInserts(
  scheduleId: string,
  startDate: string,
  endDate: string,
  definitions: ShiftDefinitionLike[]
): ShiftInsertValues[] {
  if (definitions.length === 0) return [];

  const result: ShiftInsertValues[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    for (const def of definitions) {
      result.push({
        scheduleId,
        shiftDefinitionId: def.id,
        date: dateStr,
        requiredStaffCount: def.requiredStaffCount,
        requiresChargeNurse: def.requiresChargeNurse,
      });
    }
  }

  return result;
}
