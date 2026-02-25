/**
 * Pure validation logic for shift swap requests.
 * No DB calls — the API route fetches all data and passes it in.
 * Tested independently in src/__tests__/swap/validate-swap.test.ts.
 */

export interface SwapStaffInfo {
  id: string;
  name: string;
  role: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
}

export interface SwapShiftInfo {
  /** Shift date (YYYY-MM-DD) */
  date: string;
  startTime: string;
  endTime: string;
  /** True when this particular assignment slot carries the charge nurse responsibility */
  isChargeNurse: boolean;
  unit: string;
}

export interface SwapSideParams {
  staff: SwapStaffInfo;
  /** The shift this staff member would take after the swap */
  takesShift: SwapShiftInfo;
  /**
   * Other staff already assigned to takesShift (excluding the person who is leaving it).
   * Used for Level 2 supervision check.
   */
  coworkersOnTakesShift: Array<{ icuCompetencyLevel: number }>;
  /**
   * Staff member's other assignments on takesShift.date (excluding their current position).
   * Used to detect same-date overlaps.
   */
  otherAssignmentsOnDate: Array<{ startTime: string; endTime: string }>;
  /** True when staff has an approved leave record covering takesShift.date */
  hasApprovedLeave: boolean;
}

export interface SwapViolation {
  staffId: string;
  staffName: string;
  ruleId: string;
  severity: "hard";
  description: string;
}

function timesToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

/** Returns true if two time-ranges on the same calendar date overlap (handles overnight shifts). */
export function shiftsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timesToMins(startA);
  const eA = timesToMins(endA);
  const sB = timesToMins(startB);
  const eB = timesToMins(endB);
  // Overnight: endTime < startTime — treat end as +24h
  const endANorm = eA > sA ? eA : eA + 24 * 60;
  const endBNorm = eB > sB ? eB : eB + 24 * 60;
  return sA < endBNorm && endANorm > sB;
}

/** Validate one side of a proposed swap. Returns hard violations only. */
export function validateSwapSide(side: SwapSideParams): SwapViolation[] {
  const violations: SwapViolation[] = [];
  const { staff, takesShift, coworkersOnTakesShift, otherAssignmentsOnDate, hasApprovedLeave } =
    side;

  // 1. Approved leave conflict
  if (hasApprovedLeave) {
    violations.push({
      staffId: staff.id,
      staffName: staff.name,
      ruleId: "leave-conflict",
      severity: "hard",
      description: `${staff.name} has approved leave on ${takesShift.date} and cannot be assigned this shift.`,
    });
  }

  // 2. ICU competency level ≥ 2
  if (staff.icuCompetencyLevel < 2) {
    violations.push({
      staffId: staff.id,
      staffName: staff.name,
      ruleId: "icu-competency",
      severity: "hard",
      description: `${staff.name} is Level ${staff.icuCompetencyLevel} — minimum required for ${takesShift.unit} shifts is Level 2.`,
    });
  }

  // 3. Charge nurse qualification: assignment carries charge role → need Level 4+
  if (takesShift.isChargeNurse && staff.icuCompetencyLevel < 4) {
    violations.push({
      staffId: staff.id,
      staffName: staff.name,
      ruleId: "charge-nurse",
      severity: "hard",
      description: `${staff.name} is Level ${staff.icuCompetencyLevel} — the charge nurse role requires Level 4 or above.`,
    });
  }

  // 4. Level 2 supervision: Level 2 staff in ICU/ER needs a Level 4+ coworker on the same shift
  if (staff.icuCompetencyLevel === 2) {
    const hasLevel4Coworker = coworkersOnTakesShift.some((c) => c.icuCompetencyLevel >= 4);
    if (!hasLevel4Coworker) {
      violations.push({
        staffId: staff.id,
        staffName: staff.name,
        ruleId: "competency-pairing",
        severity: "hard",
        description: `${staff.name} is Level 2 and requires a Level 4+ supervisor on the same shift. No Level 4+ staff will remain on this shift after the swap.`,
      });
    }
  }

  // 5. Same-date shift overlap
  for (const other of otherAssignmentsOnDate) {
    if (shiftsOverlap(takesShift.startTime, takesShift.endTime, other.startTime, other.endTime)) {
      violations.push({
        staffId: staff.id,
        staffName: staff.name,
        ruleId: "no-overlapping-shifts",
        severity: "hard",
        description: `${staff.name} already has a shift on ${takesShift.date} that overlaps with ${takesShift.startTime}–${takesShift.endTime}.`,
      });
      break;
    }
  }

  return violations;
}

/** Validate both sides of a proposed swap. Returns all hard violations found. */
export function validateSwap(
  requestingSide: SwapSideParams,
  targetSide: SwapSideParams
): SwapViolation[] {
  return [...validateSwapSide(requestingSide), ...validateSwapSide(targetSide)];
}
